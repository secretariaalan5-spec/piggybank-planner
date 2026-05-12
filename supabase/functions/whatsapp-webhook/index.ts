import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Constantes de Segurança ──────────────────────────────────────────────────
const MAX_TRANSACTIONS_PER_HOUR = 20; // Rate limit: evita spam/loops
const MAX_AMOUNT = 100_000;            // Sanity check de valor máximo

// ── Helpers ──────────────────────────────────────────────────────────────────
const corsHeaders = { "Access-Control-Allow-Origin": "*" };

/** Envia uma mensagem de texto de volta ao usuário no WhatsApp */
async function sendWhatsAppReply(
  to: string,
  text: string,
  phoneNumberId: string,
  apiToken: string
) {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });
}

/** Busca um valor seguro da tabela de secrets do Supabase */
async function getSecret(supabase: ReturnType<typeof createClient>, name: string): Promise<string> {
  const { data, error } = await supabase
    .from("secrets")
    .select("value")
    .eq("name", name)
    .single();
  if (error || !data) throw new Error(`Secret '${name}' não encontrado. Configure na tabela secrets.`);
  return data.value;
}

// ── Servidor Principal ───────────────────────────────────────────────────────
serve(async (req) => {
  const url = new URL(req.url);

  // ─── GET: Verificação do Webhook (exigida pela Meta) ─────────────────────
  if (req.method === "GET") {
    const mode      = url.searchParams.get("hub.mode");
    const token     = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("✅ Webhook da Meta verificado com sucesso.");
      return new Response(challenge, { status: 200 });
    }
    console.warn("⚠️ Tentativa de verificação falhou. Token incorreto.");
    return new Response("Forbidden", { status: 403 });
  }

  // ─── POST: Receber Mensagens do WhatsApp ─────────────────────────────────
  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // Responde 200 imediatamente (exigência da Meta: < 5s)
    // O processamento acontece de forma assíncrona abaixo
    const responsePromise = (async () => {
      // WhatsApp envia pings de status sem mensagens — ignora
      const messageData = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!messageData) return;

      const senderPhone = messageData.from;
      const messageId   = messageData.id;
      const messageType = messageData.type;

      // ── Inicializa o cliente Supabase com role de serviço ────────────────
      const supabaseUrl        = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const supabase           = createClient(supabaseUrl, supabaseServiceKey);

      // ── Carrega configurações do cofre ───────────────────────────────────
      let apiToken: string, phoneNumberId: string, allowedNumbers: string, geminiKey: string;
      try {
        apiToken        = await getSecret(supabase, "WHATSAPP_API_TOKEN");
        phoneNumberId   = await getSecret(supabase, "WHATSAPP_PHONE_NUMBER_ID");
        allowedNumbers  = await getSecret(supabase, "WHATSAPP_ALLOWED_NUMBERS");
        geminiKey       = await getSecret(supabase, "GEMINI_API_KEY");
      } catch (e: any) {
        console.error("Erro ao carregar secrets:", e.message);
        return;
      }

      // ── Segurança: Whitelist de números ──────────────────────────────────
      // Só aceita mensagens de números autorizados (ex: o seu próprio número)
      const allowed = allowedNumbers.split(",").map(n => n.trim().replace(/\D/g, ""));
      if (!allowed.includes(senderPhone.replace(/\D/g, ""))) {
        console.warn(`🚫 Número não autorizado: ${senderPhone}`);
        await sendWhatsAppReply(senderPhone, "Desculpe, este sistema é privado.", phoneNumberId, apiToken);
        return;
      }

      // ── Segurança: Apenas mensagens de texto ─────────────────────────────
      if (messageType !== "text") {
        await sendWhatsAppReply(
          senderPhone,
          "🤖 Por enquanto só entendo mensagens de texto.\n\nTente: *Gastei 50 no iFood*",
          phoneNumberId, apiToken
        );
        return;
      }

      const text = messageData.text?.body?.trim() ?? "";
      if (!text) return;

      // ── Comandos especiais ────────────────────────────────────────────────
      const lowerText = text.toLowerCase();

      // Comando: ajuda
      if (["ajuda", "help", "/ajuda", "?"].includes(lowerText)) {
        await sendWhatsAppReply(senderPhone, `🐷 *Piggybank Planner — Comandos*

*Registrar gastos:*
• _Gastei 50 no iFood_
• _Paguei 120 de uber_
• _Mercado 280_
• _Farmácia 35,90_

*Registrar receitas:*
• _Recebi 3000 de salário_
• _Freelance 500 hoje_

_O sistema identifica automaticamente o valor, categoria e data!_`, phoneNumberId, apiToken);
        return;
      }

      // ── Deduplicação: ignora mensagens já processadas ─────────────────────
      // Guarda o wamid (ID da mensagem do WPP) nos notes da transação para evitar duplicatas
      const { count: dupCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .like("notes", `%wamid:${messageId}%`);

      if ((dupCount ?? 0) > 0) {
        console.log(`🔄 Mensagem duplicada ignorada: ${messageId}`);
        return;
      }

      // ── Rate Limiting: máximo por hora ───────────────────────────────────
      const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
      const { count: hourCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("source", "whatsapp")
        .gte("created_at", oneHourAgo);

      if ((hourCount ?? 0) >= MAX_TRANSACTIONS_PER_HOUR) {
        await sendWhatsAppReply(
          senderPhone,
          `⚠️ Limite de ${MAX_TRANSACTIONS_PER_HOUR} lançamentos por hora atingido. Tente novamente mais tarde.`,
          phoneNumberId, apiToken
        );
        return;
      }

      // ── IA: Interpreta a mensagem com Gemini ─────────────────────────────
      const today = new Date().toISOString().split("T")[0];
      const prompt = `Você é um assistente financeiro. O usuário enviou uma mensagem em português descrevendo uma transação financeira.
Extraia os dados e retorne SOMENTE um JSON válido (sem markdown):
{"amount":0.00,"type":"expense","description":"","category":"","date":"YYYY-MM-DD"}

Categorias permitidas: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Vestuário, Assinaturas, Investimento, Salário, Outros
- type: "expense" para gastos, "income" para receitas/salário
- date: usa ${today} se não mencionada
- amount: número positivo com ponto decimal

Mensagem: "${text}"`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!geminiRes.ok) {
        console.error("Gemini error:", await geminiRes.text());
        await sendWhatsAppReply(senderPhone, "😓 Tive um problema ao processar sua mensagem. Tente novamente.", phoneNumberId, apiToken);
        return;
      }

      const geminiData = await geminiRes.json();
      let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        console.error("JSON inválido do Gemini:", rawText);
        await sendWhatsAppReply(
          senderPhone,
          `🤔 Não entendi: _"${text}"_\n\nTente: *Gastei 50 no iFood* ou *Recebi 3000 de salário*`,
          phoneNumberId, apiToken
        );
        return;
      }

      // ── Sanity checks ────────────────────────────────────────────────────
      const amount = parseFloat(parsed.amount) || 0;
      if (amount <= 0 || amount > MAX_AMOUNT) {
        await sendWhatsAppReply(senderPhone, `❌ Valor inválido (${amount}). Confira a mensagem e tente novamente.`, phoneNumberId, apiToken);
        return;
      }

      const type: "income" | "expense" = parsed.type === "income" ? "income" : "expense";

      // ── Busca a conta do usuário mais recente ─────────────────────────────
      // Usa a primeira conta ativa — no futuro pode perguntar qual conta
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("is_active", true)
        .order("created_at")
        .limit(1);

      const accountId = accounts?.[0]?.id ?? null;

      // ── Busca categoria por nome ──────────────────────────────────────────
      const catName = (parsed.category ?? "Outros").toLowerCase();
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name")
        .eq("type", type);

      const category = categories?.find(c => c.name.toLowerCase().includes(catName) || catName.includes(c.name.toLowerCase()))
        ?? categories?.find(c => c.name.toLowerCase().includes("outros"));
      const categoryId = category?.id ?? null;

      // ── Identifica o usuário pelo número de telefone ──────────────────────
      // Busca na tabela de profiles para encontrar o user_id correspondente ao número
      const cleanPhone = senderPhone.replace(/\D/g, "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone}`)
        .maybeSingle();

      if (!profile?.user_id) {
        // Se não encontrou, usa o primeiro usuário que tem esse número de conta
        // (para uso pessoal com um único usuário, busca o primeiro perfil)
        const { data: firstProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .limit(1)
          .maybeSingle();

        if (!firstProfile?.user_id) {
          console.error("Nenhum usuário encontrado no banco.");
          await sendWhatsAppReply(senderPhone, "❌ Nenhuma conta cadastrada no sistema. Acesse o app primeiro.", phoneNumberId, apiToken);
          return;
        }
        profile.user_id = firstProfile.user_id;
      }

      // ── Salva a transação no banco ────────────────────────────────────────
      const { error: insertError } = await supabase.from("transactions").insert({
        user_id:     profile.user_id,
        amount,
        type,
        description: (parsed.description ?? text).slice(0, 120),
        category_id: categoryId,
        account_id:  accountId,
        date:        parsed.date ?? today,
        source:      "whatsapp",
        notes:       `wamid:${messageId}`, // Usado para deduplicação
      });

      if (insertError) {
        console.error("Erro ao salvar transação:", insertError.message);
        await sendWhatsAppReply(senderPhone, "😓 Erro ao salvar no banco. Tente novamente.", phoneNumberId, apiToken);
        return;
      }

      // ── Confirmação para o usuário ────────────────────────────────────────
      const emoji     = type === "expense" ? "💸" : "💰";
      const typeLabel = type === "expense" ? "Gasto" : "Receita";
      const amountStr = amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const dateStr   = new Date(parsed.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

      await sendWhatsAppReply(
        senderPhone,
        `${emoji} *${typeLabel} salvo!*\n\n📝 ${parsed.description}\n💵 ${amountStr}\n🏷️ ${category?.name ?? "Outros"}\n📅 ${dateStr}\n\n_Digite *ajuda* para ver os comandos._`,
        phoneNumberId, apiToken
      );

      console.log(`✅ Transação salva via WhatsApp: ${amountStr} - ${parsed.description}`);
    })();

    // Garante que respondemos em < 5s (exigência da Meta)
    await Promise.race([
      responsePromise,
      new Promise(resolve => setTimeout(resolve, 4500)),
    ]);

    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  return new Response("Method Not Allowed", { status: 405 });
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message, user_id } = body;

    if (!message || !user_id) {
      return new Response(JSON.stringify({ error: "message e user_id são obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get Groq Key
    let groqKey = Deno.env.get("GROQ_API_KEY") ?? "";

    if (!groqKey) {
      const { data: secretsData, error: secretsError } = await supabaseAdmin
        .from("secrets")
        .select("value")
        .eq("name", "GROQ_API_KEY")
        .single();

      if (secretsData?.value) {
        groqKey = secretsData.value;
      }
    }

    if (!groqKey) {
      throw new Error("Chave do Groq não configurada no Supabase (GROQ_API_KEY). Adicione no cofre ou na tabela secrets.");
    }

    // 2. Fetch recent chat history for context
    const { data: chatHistory } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(10);

    // 3. Fetch Transaction History (Current Month) for context
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    
    const { data: recentTxs } = await supabaseAdmin
      .from("transactions")
      .select("amount, type, description, date, notes, category:categories(name)")
      .eq("user_id", user_id)
      .gte("date", firstDay)
      .order("date", { ascending: false });

    let txSummary = "Nenhuma transação registrada este mês ainda.";
    if (recentTxs && recentTxs.length > 0) {
      txSummary = recentTxs.map(t => {
        const base = `- ${t.date}: ${t.type === 'expense' ? 'Gasto' : 'Ganho'} de R$ ${t.amount} em ${t.category?.name || 'Outros'} (${t.description})`;
        return t.notes ? `${base}\n  [Detalhes/Itens: ${t.notes}]` : base;
      }).join("\n");
    }

    // 4. System Prompt with Tool instructions and Data Context
    const todayStr = today.toISOString().split("T")[0];
    const systemPrompt = `Você é o Pigly, um porquinho conselheiro financeiro de base de conhecimento do usuário.
Você é caloroso e usa emojis como 🐷, 📈, 💸. 
Regra de Ouro: Seja direto por padrão, MAS se o usuário perguntar sobre itens específicos, produtos comprados ou detalhes de uma compra, você DEVE ler a seção "[Detalhes/Itens: ...]" e listar os produtos e valores individuais detalhadamente.

--- DADOS DO USUÁRIO ---
Data de hoje: ${todayStr}
Abaixo estão as transações do usuário deste mês. Use isso para responder perguntas como "quanto gastei?", "quais alimentos comprei?" ou "onde foi meu dinheiro?":
${txSummary}
------------------------

Seu SUPER PODER é registrar novas transações no sistema.
Se o usuário pedir para registrar um gasto, pagamento, compra ou recebimento (ex: "gastei 50 no ifood", "salario caiu 2000"), você NÃO DEVE responder com texto.
Você DEVE obrigatoriamente retornar um JSON válido neste formato:
{"__TOOL_CALL__": "register_transaction", "amount": 50.00, "type": "expense", "description": "iFood", "category": "Alimentação"}

Categorias válidas: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Vestuário, Assinaturas, Investimento, Salário, Outros.
Use type="expense" para gastos e "income" para ganhos.

Para perguntas normais ou análises de gastos, responda como um porquinho analista e detalhista em texto normal, usando as informações acima.`;

    // 4. Prepara mensagens no formato OpenAI para o Groq
    const messages = [
      { role: "system", content: systemPrompt },
      ...(chatHistory || []).reverse().map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    // 5. Call Groq API (Llama 3.3 70B Versatile)
    const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
    const groqResponse = await fetch(groqUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.2
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      console.error("Groq API Error:", err);
      throw new Error(`Erro de comunicação com o Groq: ${err}`);
    }

    const groqData = await groqResponse.json();
    let textResult = groqData.choices?.[0]?.message?.content ?? "";
    textResult = textResult.replace(/```json/gi, "").replace(/```/g, "").trim();

    let finalReply = textResult;

    // 5. Handle Tool Call (Action Execution)
    if (textResult.includes("__TOOL_CALL__")) {
      try {
        const parsedTool = JSON.parse(textResult);
        if (parsedTool.__TOOL_CALL__ === "register_transaction") {
          
          // Buscar primeira conta do usuário
          const { data: accounts } = await supabaseAdmin.from("accounts").select("id").eq("user_id", user_id).limit(1);
          const accountId = accounts?.[0]?.id;

          // Buscar Categoria Real
          const { data: categories } = await supabaseAdmin.from("categories").select("id, name").eq("user_id", user_id);
          let categoryId = null;
          const targetCat = parsedTool.category.toLowerCase();
          
          if (categories) {
            const found = categories.find(c => c.name.toLowerCase().includes(targetCat));
            categoryId = found?.id || categories.find(c => c.name.toLowerCase().includes("outros"))?.id;
          }

          if (!accountId || !categoryId) {
             finalReply = "Ops! 🐷 Tive um probleminha ao tentar salvar o registro. Verifique se você tem uma conta criada no app.";
          } else {
             // Inserir Transação
             const { error: txError } = await supabaseAdmin.from("transactions").insert({
               user_id: user_id,
               account_id: accountId,
               category_id: categoryId,
               amount: parsedTool.amount,
               type: parsedTool.type,
               description: parsedTool.description,
               date: today
             });

             if (txError) throw txError;

             finalReply = `Pronto! 📝 Registrei R$ ${parsedTool.amount.toFixed(2)} em ${parsedTool.category}. Oink! 🐷`;
          }
        }
      } catch (err) {
        console.error("Falha ao processar tool call:", err);
        finalReply = "Oink! Entendi que é um gasto, mas não consegui ler os dados direito. Pode repetir de outra forma? 🐷";
      }
    }

    // 6. Save Assistant's final reply to DB
    await supabaseAdmin.from("chat_messages").insert({
      user_id: user_id,
      role: "assistant",
      content: finalReply,
    });

    return new Response(JSON.stringify({ reply: finalReply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro no oink-chat:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
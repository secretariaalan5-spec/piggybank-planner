import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * parse-message — Fase 2 do Plano de Inteligência
 *
 * Recebe uma mensagem em texto livre (como viria do WhatsApp) e usa o
 * Gemini para extrair: amount, type, description, category e date.
 *
 * Entrada: { message: string }
 * Saída:   { amount, type, description, category, date, rawText }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Campo 'message' é obrigatório e não pode estar vazio." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // ── Pega a chave do Gemini do cofre do Supabase ─────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: secretsData, error: secretsError } = await supabaseAdmin
      .from("secrets")
      .select("value")
      .eq("name", "GEMINI_API_KEY")
      .single();

    if (secretsError || !secretsData) {
      throw new Error("Chave do Gemini não configurada. Adicione GEMINI_API_KEY na tabela secrets.");
    }

    const geminiKey = secretsData.value;

    // ── Monta o prompt para extração de dados financeiros ────────
    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = `
Você é um assistente financeiro pessoal inteligente. O usuário vai te enviar uma mensagem em português
descrevendo um gasto, receita ou transferência financeira — exatamente como enviaria pelo WhatsApp.

Sua tarefa é extrair os dados estruturados e devolver SOMENTE um JSON válido (sem markdown, sem texto extra, sem crases).

Formato obrigatório:
{
  "amount": 0.00,
  "type": "expense",
  "description": "Descrição curta",
  "category": "categoria",
  "date": "YYYY-MM-DD"
}

Regras:
- "amount": número positivo com casas decimais usando ponto (ex: 49.90). Extraia o valor da mensagem.
- "type": use "expense" para gastos/compras/pagamentos e "income" para salário/recebimentos/renda/transferência recebida.
- "description": nome do estabelecimento ou descrição curta (máximo 60 caracteres).
- "category": escolha a categoria mais adequada DENTRE ESTAS OPÇÕES EXATAS:
  Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Vestuário, Assinaturas, Investimento, Salário, Outros
- "date": data no formato YYYY-MM-DD. Se não houver data na mensagem, use a data de hoje: ${today}.

Exemplos de entrada → saída:
"gastei 50 no ifood"        → { "amount": 50.00, "type": "expense", "description": "iFood", "category": "Alimentação", "date": "${today}" }
"paguei 120 de uber"        → { "amount": 120.00, "type": "expense", "description": "Uber", "category": "Transporte", "date": "${today}" }
"recebi 3000 de salário"    → { "amount": 3000.00, "type": "income", "description": "Salário", "category": "Salário", "date": "${today}" }
"farmácia 35,90"            → { "amount": 35.90, "type": "expense", "description": "Farmácia", "category": "Saúde", "date": "${today}" }
"netflix 55,90"             → { "amount": 55.90, "type": "expense", "description": "Netflix", "category": "Assinaturas", "date": "${today}" }
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nMensagem do usuário: "${message}"` }]
        }]
      }),
    });

    if (!geminiResponse.ok) {
      const err = await geminiResponse.text();
      console.error("Gemini API Error:", err, "URL:", geminiUrl.split("?")[0]);
      throw new Error(`Erro ao consultar o Gemini: ${geminiResponse.status} - ${err}`);
    }

    const geminiData = await geminiResponse.json();
    let textResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Limpeza defensiva (caso a IA adicione markdown)
    textResult = textResult.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsedData: Record<string, unknown>;
    try {
      parsedData = JSON.parse(textResult);
    } catch {
      console.error("JSON inválido retornado pelo Gemini:", textResult);
      throw new Error(`A IA não conseguiu entender. Resposta crua: ${textResult}`);
    }

    // Validação básica dos campos obrigatórios
    if (!parsedData.amount || !parsedData.type) {
      throw new Error("Não consegui identificar o valor ou tipo da transação na mensagem.");
    }

    return new Response(
      JSON.stringify({ ...parsedData, rawText: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro no parse-message:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});

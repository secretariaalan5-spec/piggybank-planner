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

    // 1. Get Gemini Key
    const { data: secretsData, error: secretsError } = await supabaseAdmin
      .from("secrets")
      .select("value")
      .eq("name", "GEMINI_API_KEY")
      .single();

    if (secretsError || !secretsData) {
      throw new Error("Chave do Gemini não configurada.");
    }
    const geminiKey = secretsData.value;

    // 2. Fetch recent chat history for context
    const { data: chatHistory } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(10);
    
    // Reverse to chronological order
    const history = (chatHistory || []).reverse().map(msg => {
      // Gemini uses "user" and "model" roles
      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      };
    });

    // Append the new message
    history.push({
      role: "user",
      parts: [{ text: message }]
    });

    // 3. System Prompt with Tool instructions
    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = `Você é o Pigly, um porquinho conselheiro financeiro de bolso do usuário.
Você é caloroso, usa emojis como 🐷, 📈, 💸 e responde de forma curta e direta (máximo 2-3 frases).

Seu SUPER PODER é registrar as transações no sistema.
Se o usuário pedir para registrar um gasto, pagamento, compra ou recebimento (ex: "gastei 50 no ifood", "salario caiu 2000"), você NÃO DEVE responder com texto.
Você DEVE obrigatoriamente retornar um JSON válido neste formato:
{"__TOOL_CALL__": "register_transaction", "amount": 50.00, "type": "expense", "description": "iFood", "category": "Alimentação"}

Categorias válidas: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Vestuário, Assinaturas, Investimento, Salário, Outros.
Use type="expense" para gastos e "income" para ganhos.

Para perguntas normais ("como economizar?", "oi"), responda como um porquinho amigável em texto normal. Data de hoje: ${today}.`;

    // 4. Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: history,
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error("Erro de comunicação com o Gemini");
    }

    const geminiData = await geminiResponse.json();
    let textResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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

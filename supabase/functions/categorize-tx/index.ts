import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
    const { description, categories = [], type = "expense" } = body;

    if (!description) {
      throw new Error("Descrição não fornecida.");
    }

    // 1. Pega a chave secreta do banco de dados ou do Deno.env
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let groqKey = Deno.env.get("GROQ_API_KEY") ?? "";

    if (!groqKey) {
      const { data: secretsData } = await supabaseAdmin
        .from('secrets')
        .select('value')
        .eq('name', 'GROQ_API_KEY')
        .single();

      if (secretsData?.value) {
        groqKey = secretsData.value;
      }
    }

    if (!groqKey) {
      throw new Error("GROQ_API_KEY não configurada no servidor.");
    }

    const prompt = `Você é um especialista financeiro de IA de ponta.
O usuário quer categorizar uma transação com a seguinte descrição: "${description}".
O tipo da transação é: "${type === 'income' ? 'Ganho/Receita' : 'Gasto/Despesa'}".
Aqui estão as categorias existentes do usuário com seus respectivos IDs e nomes:
${JSON.stringify(categories.map((c: any) => ({ id: c.id, name: c.name, type: c.type })), null, 2)}

Sua tarefa:
1. Analise se alguma das categorias existentes é um ótimo match semântico para "${description}".
2. Se houver um ótimo match, defina "isNew" como false, "matchedCategoryId" com o ID da categoria correspondente, e "newCategory" como null.
3. Se NENHUMA categoria existente for um bom match (ex: o usuário cortou o cabelo e não tem categoria de Beleza/Cuidados Pessoais), defina "isNew" como true, "matchedCategoryId" como null, e crie uma "newCategory" com:
   - "name": O nome ideal da nova categoria (ex: "Cuidados Pessoais", "Barbearia", "Assinaturas", "Oficina", etc).
   - "icon": O nome exato de um ícone da biblioteca Lucide React (ex: "Scissors", "Sparkles", "ShoppingBag", "Heart", "Car", "Coffee", "Home", "Zap", "Target", "TrendingUp", etc).
   - "color": Uma cor hexadecimal bonita e vibrante (ex: "#ec4899", "#8b5cf6", "#3b82f6", "#f59e0b", "#10b981", "#14b8a6", "#06b6d4", "#f43f5e").

Retorne OBRIGATORIAMENTE APENAS um objeto JSON válido com a seguinte estrutura exata:
{
  "isNew": boolean,
  "matchedCategoryId": string | null,
  "newCategory": {
    "name": string,
    "icon": string,
    "color": string
  } | null
}`;

    // Chamada à API do Groq
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Você é um assistente financeiro que retorna apenas JSON válido." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`Erro na API do Groq: ${errorText}`);
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices[0].message.content;
    const parsedResult = JSON.parse(content);

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

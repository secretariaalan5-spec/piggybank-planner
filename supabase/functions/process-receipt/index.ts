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
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      throw new Error("Nenhuma imagem foi recebida.");
    }

    // 1. Pega a chave secreta do banco de dados ou do Deno.env
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let groqKey = Deno.env.get("GROQ_API_KEY") ?? "";

    if (!groqKey) {
      const { data: secretsData, error: secretsError } = await supabaseAdmin
        .from('secrets')
        .select('value')
        .eq('name', 'GROQ_API_KEY')
        .single();

      if (secretsData?.value) {
        groqKey = secretsData.value;
      }
    }

    if (!groqKey) {
      throw new Error("Chave do Groq não configurada no Supabase (GROQ_API_KEY). Adicione no cofre ou na tabela secrets.");
    }

    // 2. Prepara a chamada para o Groq (Llama 3.2 90B Vision)
    // IA ultra potente, com limite gratuito massivo e raciocínio visual de ponta
    const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

    const prompt = `
Você é um extrator de recibos especialista em finanças pessoais. Leia a imagem deste cupom fiscal ou recibo (NFC-e, SAT, etc.) LINHA POR LINHA.
Extraia os seguintes dados estruturados EXATAMENTE neste formato JSON (sem markdown, sem crases, apenas o objeto):
{
  "description": "Nome do estabelecimento curto (ex: Padaria Santa Cruz)",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "items": [
    { "name": "BIFE ESPECIAL KG", "price": 40.71, "category": "Alimentação" }
  ]
}
Regras:
1. amount deve ser o VALOR TOTAL (number), separe as casas decimais com ponto (.). Não use R$.
2. date deve estar no formato ISO (YYYY-MM-DD). Se não encontrar a data no recibo, use a data atual.
3. items DEVE ser uma lista exaustiva. VOCÊ É OBRIGADO a extrair TODOS os itens impressos no cupom, um por um, sem resumir e sem omitir nada. Se tiver 20 itens na foto, a lista deve ter 20 itens.
4. O price deve ser o "Valor Total" do item (number com ponto).
5. Não escreva NENHUM texto além do JSON válido.
`;

    const groqResponse = await fetch(groqUrl, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` } }
            ]
          }
        ],
        temperature: 0.1
      })
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      console.error("Groq API Error:", err);
      throw new Error(`O Groq rejeitou a imagem ou a chave: ${err}`);
    }

    const groqData = await groqResponse.json();
    let textResult = groqData.choices[0].message.content;
    
    // Limpeza de segurança (caso a IA responda com markdown ```json)
    textResult = textResult.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const parsedObj = JSON.parse(textResult);

    // 3. Devolve os dados estruturados e encerra o processo
    // (A IMAGEM MORRE AQUI NA MEMÓRIA DA FUNÇÃO, NADA É SALVO NO BANCO)
    return new Response(JSON.stringify(parsedObj), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na leitura do recibo:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
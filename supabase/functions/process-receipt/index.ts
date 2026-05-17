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

    // 1. Pega a chave secreta do banco de dados
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: secretsData, error: secretsError } = await supabaseAdmin
      .from('secrets')
      .select('value')
      .eq('name', 'GEMINI_API_KEY')
      .single();

    if (secretsError || !secretsData) {
      throw new Error("Chave do Gemini não configurada no cofre.");
    }

    const geminiKey = secretsData.value;

    // 2. Prepara a chamada para o Gemini
    // Usando 1.5 Pro para máxima precisão em recibos longos e leitura de QR Codes
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${geminiKey}`;

    const prompt = `
Você é um extrator de recibos especialista em finanças pessoais. Leia a imagem deste cupom fiscal ou recibo (NFC-e, SAT, etc.).
Extraia os seguintes dados estruturados EXATAMENTE neste formato JSON (sem markdown, sem crases, apenas o objeto):
{
  "description": "Nome do estabelecimento curto (ex: Padaria Santa Cruz)",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "items": [
    { "name": "Arroz 5kg", "price": 25.90, "category": "Alimentação" }
  ]
}
Regras:
1. amount deve ser o VALOR TOTAL (number), separe as casas decimais com ponto (.). Não use R$.
2. date deve estar no formato ISO (YYYY-MM-DD). Se não encontrar a data no recibo, use a data atual.
3. items DEVE ser uma lista exaustiva com TODOS os itens lidos no cupom fiscal. Leia com muita atenção a lista impressa. Inclua o nome do produto, o valor total do item, e a categoria sugerida.
4. Se a imagem contiver um QR Code da SEFAZ, você pode usá-lo como contexto, mas a sua prioridade máxima é extrair os itens da lista de produtos impressa na foto.
5. Não escreva NENHUM texto além do JSON válido. Se não conseguir ler os itens, retorne "items": [] mas tente ao máximo extrair o que der.
`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } }
          ]
        }],
        generationConfig: { 
          temperature: 0.1 // Baixa temperatura = maior precisão
        }
      })
    });

    if (!geminiResponse.ok) {
      const err = await geminiResponse.text();
      console.error("Gemini API Error:", err);
      throw new Error(`O Google Gemini rejeitou a imagem ou a chave: ${err}`);
    }

    const geminiData = await geminiResponse.json();
    let textResult = geminiData.candidates[0].content.parts[0].text;
    
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
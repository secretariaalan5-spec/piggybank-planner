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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: secretsData, error: secretsError } = await supabaseAdmin
      .from('secrets')
      .select('name, value');

    if (secretsError || !secretsData) {
      throw new Error("Não foi possível ler as chaves da Belvo no banco.");
    }

    const secrets = Object.fromEntries(secretsData.map(s => [s.name, s.value]));
    
    const belvoSecretId = secrets.BELVO_SECRET_ID;
    const belvoSecretPassword = secrets.BELVO_SECRET_PASSWORD;
    const belvoEnv = secrets.BELVO_ENV || "sandbox";

    const belvoUrl = belvoEnv === "production" ? "https://api.belvo.com" : "https://sandbox.belvo.com";
    
    // As chaves que estão no banco
    console.log("Usando ID:", belvoSecretId);

    // Endpoint oficial da Belvo para o Widget
    const res = await fetch(`${belvoUrl}/api/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: belvoSecretId,
        password: belvoSecretPassword,
        scopes: "read_institutions,write_links,read_links",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Belvo rejeitou as chaves (Status ${res.status}): ${errText}`);
    }

    const data = await res.json();

    return new Response(JSON.stringify({ access: data.access }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const origin = Deno.env.get("SITE_URL") || "https://lopi.yo2.cz";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Vygenerujte nový state
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minut

    // Uložte state do databáze
    const { error: insertError } = await supabaseAdmin
      .from("oauth_states")
      .insert({
        state,
        code_verifier: crypto.randomUUID(),
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Failed to insert oauth_state:", insertError);
      throw insertError;
    }

    const redirectUri = `${origin}/oauth`;

    return new Response(
      JSON.stringify({
        state,
        redirectUri,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("OAuth start error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

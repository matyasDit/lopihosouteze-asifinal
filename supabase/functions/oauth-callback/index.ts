import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const origin = Deno.env.get("SITE_URL") || "https://lopi.yo2.cz";

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const clientIP =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    // Kontrola OAuth chyby z providera
    if (errorParam) {
      return Response.redirect(`${origin}/oauth?error=${errorParam}`, 302);
    }

    // ===== VALIDACE STATE (CSRF OCHRANA) =====
    if (!state) {
      return Response.redirect(`${origin}/oauth?error=missing_state`, 302);
    }

    const { data: stateRecord, error: stateError } = await supabaseAdmin
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .single();

    if (stateError || !stateRecord) {
      console.error("State validation failed:", stateError);
      return Response.redirect(`${origin}/oauth?error=invalid_state`, 302);
    }

    // Kontrola expiraci
    if (new Date() > new Date(stateRecord.expires_at)) {
      return Response.redirect(`${origin}/oauth?error=state_expired`, 302);
    }

    // Kontrola, zda nebyl state již použit
    if (stateRecord.used_at) {
      return Response.redirect(`${origin}/oauth?error=state_reused`, 302);
    }
    // ===== KONEC VALIDACE STATE =====

    if (!code) {
      return Response.redirect(`${origin}/oauth?error=missing_code`, 302);
    }

    // OAuth config z env
    const clientId = Deno.env.get("OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("OAUTH_CLIENT_SECRET");
    const tokenUrl = Deno.env.get("OAUTH_TOKEN_URL");
    const userInfoUrl = Deno.env.get("OAUTH_USERINFO_URL");

    if (!clientId || !clientSecret || !tokenUrl || !userInfoUrl) {
      console.error("OAuth config missing");
      return Response.redirect(`${origin}/oauth?error=config_error`, 302);
    }

    const redirectUri = `${origin}/oauth`;

    // === EXCHANGE CODE FOR TOKEN ===
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenResponse.status);
      return Response.redirect(`${origin}/oauth?error=token_exchange`, 302);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("No access token in response");
      return Response.redirect(`${origin}/oauth?error=no_access_token`, 302);
    }

    // === GET USER INFO ===
    const userInfoResponse = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error("User info fetch failed:", userInfoResponse.status);
      return Response.redirect(`${origin}/oauth?error=userinfo_failed`, 302);
    }

    const userData = await userInfoResponse.json();

    const username = userData.nickname || userData.username || userData.name;
    const alikUserId = userData.sub;
    const userLink = userData.user_link || "";

    const avatarUrl = username
      ? `https://www.alik.cz/-/avatar/${encodeURIComponent(username)}`
      : null;

    if (!username || !alikUserId) {
      console.error("Invalid user data from provider");
      return Response.redirect(`${origin}/oauth?error=invalid_user_data`, 302);
    }

    const email = `alik_${alikUserId}@ls.local`;

    // === FIND OR CREATE USER ===
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    let existingUser = users.users.find(
      (u) => u.user_metadata?.alik_user_id === alikUserId
    );

    let userId: string;

    if (existingUser) {
      // Update existing user
      userId = existingUser.id;

      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          username,
          user_link: userLink,
          avatar_url: avatarUrl,
        },
      });

      await supabaseAdmin
        .from("profiles")
        .update({
          username,
          avatar_url: avatarUrl,
        })
        .eq("id", userId);
    } else {
      // Create new user
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();

      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            username,
            alik_user_id: alikUserId,
            user_link: userLink,
            avatar_url: avatarUrl,
            oauth_provider: "alik",
          },
        });

      if (createError) {
        console.error("User creation failed:", createError);
        return Response.redirect(`${origin}/oauth?error=create_user_failed`, 302);
      }

      userId = newUser.user.id;

      // Create profile
      await supabaseAdmin.from("profiles").insert({
        id: userId,
        username,
        avatar_url: avatarUrl,
      });
    }

    // === MARK STATE AS USED ===
    await supabaseAdmin
      .from("oauth_states")
      .update({ used_at: new Date().toISOString() })
      .eq("state", state);

    // === CREATE SUPABASE SESSION ===
    const { data: sessionData, error: sessionError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${origin}?oauth_success=true`,
        },
      });

    if (sessionError) {
      console.error("Session generation failed:", sessionError);
      return Response.redirect(`${origin}/oauth?error=session_failed`, 302);
    }

    // Extract tokens from the magic link session
    const actionLink = sessionData.properties.action_link;

    // Redirect to action link - Supabase will handle setting the session
    return Response.redirect(actionLink, 302);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return Response.redirect(`${origin}/oauth?error=unexpected_error`, 302);
  }
});

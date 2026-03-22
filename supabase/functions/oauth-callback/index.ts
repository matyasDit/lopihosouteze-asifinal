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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const origin = Deno.env.get("SITE_URL") || "https://lopi.yo2.cz";

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { code, state, redirectUri } = body;

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: "missing_code_or_state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OAuth config z env
    const clientId = Deno.env.get("OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("OAUTH_CLIENT_SECRET");
    const tokenUrl = Deno.env.get("OAUTH_TOKEN_URL");
    const userInfoUrl = Deno.env.get("OAUTH_USERINFO_URL");

    if (!clientId || !clientSecret || !tokenUrl || !userInfoUrl) {
      console.error("Missing OAuth config");
      return new Response(
        JSON.stringify({ error: "config_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === EXCHANGE CODE FOR TOKEN ===
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    console.log("Exchanging code for token...");
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenResponse.status, await tokenResponse.text());
      return new Response(
        JSON.stringify({ error: "token_exchange_failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("No access token in response");
      return new Response(
        JSON.stringify({ error: "no_access_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === GET USER INFO ===
    console.log("Fetching user info...");
    const userInfoResponse = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error("User info fetch failed:", userInfoResponse.status);
      return new Response(
        JSON.stringify({ error: "userinfo_failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await userInfoResponse.json();

    const username = userData.nickname || userData.username || userData.name;
    const alikUserId = userData.sub;
    const userLink = userData.user_link || "";

    const avatarUrl = username
      ? `https://www.alik.cz/-/avatar/${encodeURIComponent(username)}`
      : null;

    if (!username || !alikUserId) {
      console.error("Invalid user data:", userData);
      return new Response(
        JSON.stringify({ error: "invalid_user_data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = `alik_${alikUserId}@ls.local`;

    // === FIND OR CREATE USER ===
    console.log("Looking for user:", alikUserId);
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    let existingUser = users.users.find(
      (u) => u.user_metadata?.alik_user_id === alikUserId
    );

    let userId: string;
    let authToken: string;
    let refreshToken: string;

    if (existingUser) {
      console.log("Found existing user:", existingUser.id);
      userId = existingUser.id;

      // Update user metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          username,
          user_link: userLink,
          avatar_url: avatarUrl,
        },
      });

      // Update profile
      await supabaseAdmin
        .from("profiles")
        .update({
          username,
          avatar_url: avatarUrl,
        })
        .eq("id", userId);

      // Vygenerujte nový token
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
        return new Response(
          JSON.stringify({ error: "session_failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract tokens from the magic link
      const { data: session } = await supabaseAdmin.auth.admin.getUser(userId);
      // Use temporary token
      authToken = sessionData.properties.action_link.split("#")[1] || "";
      refreshToken = sessionData.properties.action_link.split("#")[1] || "";
    } else {
      console.log("Creating new user:", alikUserId);
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
        return new Response(
          JSON.stringify({ error: "create_user_failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;

      // Create profile
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        username,
        avatar_url: avatarUrl,
      });

      if (profileError) {
        console.error("Profile creation failed:", profileError);
      }

      // Vygenerujte token pro nového uživatele
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
        return new Response(
          JSON.stringify({ error: "session_failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authToken = sessionData.properties.action_link.split("#")[1] || "";
      refreshToken = sessionData.properties.action_link.split("#")[1] || "";
    }

    console.log("OAuth callback successful for user:", userId);

    return new Response(
      JSON.stringify({
        accessToken: authToken,
        refreshToken: refreshToken,
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
    console.error("OAuth callback error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "unexpected_error",
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

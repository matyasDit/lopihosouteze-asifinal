import { supabase } from "@/integrations/supabase/client";

const ALIK_AUTH_URL = "https://www.alik.cz/oauth/authorize";
const OAUTH_CLIENT_ID = "lopiho-soutez";

export async function startOAuthLogin() {
  try {
    // Zavolejte serverside funkci k vygenerování state
    const response = await fetch("/oauth-start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to start OAuth flow");
    }

    const { state, redirectUri } = await response.json();

    // Přesměrujte na Alíka
    const params = new URLSearchParams({
      response_type: "code",
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: redirectUri,
      state,
    });

    window.location.href = `${ALIK_AUTH_URL}?${params.toString()}`;
  } catch (error) {
    console.error("OAuth start error:", error);
    throw error;
  }
}

export function getStoredState(): string | null {
  return localStorage.getItem("oauth_state");
}

export function clearStoredState() {
  localStorage.removeItem("oauth_state");
}

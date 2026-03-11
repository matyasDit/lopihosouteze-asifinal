const SUPABASE_URL = "https://wmmwsbrevzfeqzdrcbrc.supabase.co";
const ALIK_AUTH_URL = "https://www.alik.cz/oauth/authorize";

export async function startOAuthLogin() {
  const state = crypto.randomUUID();
  localStorage.setItem("oauth_state", state);

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: "lopiho-soutez",
    redirect_uri: redirectUri,
    state,
  });

  window.location.href = `${ALIK_AUTH_URL}?${params.toString()}`;
}

export function getStoredState(): string | null {
  return localStorage.getItem("oauth_state");
}

export function clearStoredState() {
  localStorage.removeItem("oauth_state");
}

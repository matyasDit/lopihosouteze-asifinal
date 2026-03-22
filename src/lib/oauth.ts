const ALIK_AUTH_URL = "https://www.alik.cz/oauth/authorize";
const OAUTH_CLIENT_ID = "lopiho-soutez";
const ORIGIN = window.location.origin;

export async function startOAuthLogin() {
  try {
    // Vygenerujte state přímo v browseru
    const state = crypto.randomUUID();
    
    // Uložte do sessionStorage (ne localStorage - aby se smazal po zavření tabu)
    sessionStorage.setItem("oauth_state", state);
    
    const redirectUri = `${ORIGIN}/oauth`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: redirectUri,
      state,
    });

    window.location.href = `${ALIK_AUTH_URL}?${params.toString()}`;
  } catch (error) {
    console.error("OAuth start error:", error);
    throw new Error("Chyba při inicializaci přihlášení");
  }
}

export function getStoredState(): string | null {
  return sessionStorage.getItem("oauth_state");
}

export function clearStoredState() {
  sessionStorage.removeItem("oauth_state");
}

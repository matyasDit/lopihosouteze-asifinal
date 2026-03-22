import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getStoredState, clearStoredState } from "@/lib/oauth";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const errorMsg = params.get("error");
        const code = params.get("code");
        const state = params.get("state");

        // Kontrola OAuth chyby z providera
        if (errorMsg) {
          setError(errorMsg);
          clearStoredState();
          setChecking(false);
          return;
        }

        // Validace state
        const storedState = getStoredState();
        if (!state || state !== storedState) {
          setError("invalid_state");
          clearStoredState();
          setChecking(false);
          return;
        }

        if (!code) {
          setError("missing_code");
          clearStoredState();
          setChecking(false);
          return;
        }

        // Zavolejte backend funkci na Supabase
        const redirectUri = `${window.location.origin}/oauth`;
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            state,
            redirectUri,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || "token_exchange_failed");
          setChecking(false);
          return;
        }

        const { accessToken, refreshToken } = await response.json();

        // Nastavte session v Supabase
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        clearStoredState();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError("session_failed");
          setChecking(false);
          return;
        }

        // Přesměrujte domů
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Callback error:", err);
        setError("unexpected_error");
        setChecking(false);
      }
    };

    handleCallback();
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Ověřuji přihlášení...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessages: Record<string, string> = {
      invalid_state: "Bezpečnostní ověření selhalo. Zkuste se přihlásit znovu.",
      missing_code: "Autorizační kód chybí. Zkuste se přihlásit znovu.",
      token_exchange_failed: "Chyba při výměně tokenu. Zkuste se přihlásit znovu.",
      session_failed: "Nepodařilo se vytvořit relaci. Zkuste se přihlásit znovu.",
      unexpected_error: "Došlo k neočekávané chybě. Zkuste se přihlásit znovu.",
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-destructive">Chyba přihlášení</h1>
          <p className="mb-4 text-muted-foreground">
            {errorMessages[error] || "Chyba při přihlášení"}
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Zpět na přihlášení
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Přihlašování...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;

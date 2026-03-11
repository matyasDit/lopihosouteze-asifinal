import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearStoredState } from "@/lib/oauth";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Check for error in query params
      const params = new URLSearchParams(window.location.search);
      const errorMsg = params.get("error");
      if (errorMsg) {
        setError(errorMsg);
        clearStoredState();
        return;
      }

      // Extract tokens from URL hash
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setError("Chybí přihlašovací tokeny");
        clearStoredState();
        return;
      }

      // Set the session in Supabase client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      clearStoredState();

      if (sessionError) {
        console.error("Session error:", sessionError);
        setError("Nepodařilo se nastavit session");
        return;
      }

      // Clean URL and redirect
      window.history.replaceState(null, "", "/oauth");
      navigate("/", { replace: true });
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-destructive">Chyba přihlášení</h1>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Zpět na hlavní stránku
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

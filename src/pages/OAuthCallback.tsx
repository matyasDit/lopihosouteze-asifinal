import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const errorMsg = params.get("error");

      if (errorMsg) {
        setError(errorMsg);
        return;
      }

      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Already authenticated
        navigate("/", { replace: true });
      } else {
        // Wait for session from magic link
        const interval = setInterval(async () => {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            clearInterval(interval);
            navigate("/", { replace: true });
          }
        }, 500);

        // Timeout after 10 seconds
        setTimeout(() => clearInterval(interval), 10000);
      }
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

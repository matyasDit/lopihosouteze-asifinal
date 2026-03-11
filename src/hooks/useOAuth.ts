import { useState } from "react";
import { startOAuthLogin } from "@/lib/oauth";

export function useOAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startOAuthFlow = async () => {
    try {
      setLoading(true);
      setError(null);
      await startOAuthLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při přihlašování");
      setLoading(false);
      throw err;
    }
  };

  return { startOAuthFlow, login: startOAuthFlow, loading, error, isConfigured: true };
}

import { useState } from "react";
import { startOAuthLogin } from "@/lib/oauth";

export function useOAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    try {
      setLoading(true);
      setError(null);
      await startOAuthLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při přihlašování");
      setLoading(false);
    }
  };

  return { login, loading, error };
}

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  setSessionMock: vi.fn(),
  clearStoredStateMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocked.navigateMock,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      setSession: mocked.setSessionMock,
    },
  },
}));

vi.mock("@/lib/oauth", () => ({
  clearStoredState: mocked.clearStoredStateMock,
}));

import OAuthCallback from "./OAuthCallback";

describe("OAuthCallback", () => {
  beforeEach(() => {
    mocked.navigateMock.mockReset();
    mocked.setSessionMock.mockReset();
    mocked.clearStoredStateMock.mockReset();
    window.history.replaceState({}, "", "/oauth");
  });

  it("zobrazi chybu z query parametru a vycisti state", async () => {
    window.history.replaceState({}, "", "/oauth?error=invalid_state");

    render(<OAuthCallback />);

    expect(await screen.findByText("Chyba přihlášení")).toBeInTheDocument();
    expect(screen.getByText("invalid_state")).toBeInTheDocument();
    expect(mocked.clearStoredStateMock).toHaveBeenCalledTimes(1);
    expect(mocked.setSessionMock).not.toHaveBeenCalled();
  });

  it("nastavi session z hash tokenu a presmeruje na hlavni stranku", async () => {
    mocked.setSessionMock.mockResolvedValue({ error: null });
    window.history.replaceState({}, "", "/oauth#access_token=acc123&refresh_token=ref123");

    render(<OAuthCallback />);

    await waitFor(() => {
      expect(mocked.setSessionMock).toHaveBeenCalledWith({
        access_token: "acc123",
        refresh_token: "ref123",
      });
    });

    expect(mocked.clearStoredStateMock).toHaveBeenCalledTimes(1);
    expect(mocked.navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });

  it("zobrazi chybu pri chybejicich tokenech", async () => {
    window.history.replaceState({}, "", "/oauth");

    render(<OAuthCallback />);

    expect(await screen.findByText("Chyba přihlášení")).toBeInTheDocument();
    expect(screen.getByText("Chybí přihlašovací tokeny")).toBeInTheDocument();
    expect(mocked.clearStoredStateMock).toHaveBeenCalledTimes(1);
  });
});

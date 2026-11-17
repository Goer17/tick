import { useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { api, ApiError, setToken } from "../api";
import { playSound } from "../lib/sounds";

interface LoginProps {
  onSuccess: () => void;
}

export function Login({ onSuccess }: LoginProps): React.JSX.Element {
  const [token, setTokenValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const value = token.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.login(value);
      setToken(value);
      playSound("login");
      onSuccess();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-grid" aria-hidden="true" />
      <div className="login-glow" aria-hidden="true" />
      <main className="login-card">
        <div className="login-brand">
          <img className="brand-logo" src="/logo.svg" alt="" />
          <span>TICK</span>
        </div>
        <p className="login-caption">A quiet place for deadlines, lists, and important goals.</p>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span className="field-label">
              <KeyRound size={13} /> Access token
            </span>
            <input
              autoFocus
              type="password"
              value={token}
              onChange={(event) => setTokenValue(event.target.value)}
              placeholder="Paste your access token"
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button login-submit" type="submit" disabled={busy || !token.trim()}>
            {busy ? "Checking…" : "Enter workspace"}
            {!busy ? <ArrowRight size={15} /> : null}
          </button>
        </form>
        <p className="login-hint">The token is configured with TICK_ACCESS_TOKEN on the server.</p>
      </main>
    </div>
  );
}

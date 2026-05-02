/**
 * AuthGate — wraps any page that requires a workbench-scoped token.
 *
 * Logic:
 *   1. If a non-expired token exists in localStorage → render children.
 *   2. Otherwise → kick off the OAuth 2.1 + PKCE redirect via
 *      beginPkceLogin (Path B). The browser navigates away to the
 *      proofofaiwork.com /oauth/authorize wrapper page; the user
 *      eventually lands on /auth/callback which calls completePkceLogin
 *      and routes back here.
 *   3. In dev mode (VITE_AUTH_ORIGIN unset), show a "paste dev token"
 *      box so the rest of the UI can be exercised before the OAuth
 *      flow is wired up locally.
 */

import { useEffect, useState } from "react";
import { env } from "@/lib/env";
import { beginPkceLogin, getToken, setDevToken } from "@/lib/auth";

type AuthState =
  | { kind: "checking" }
  | { kind: "authed" }
  | { kind: "needs_handoff" }
  | { kind: "dev_fallback" }
  | { kind: "error"; message: string };

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [state, setState] = useState<AuthState>({ kind: "checking" });
  const [devTokenInput, setDevTokenInput] = useState("");

  useEffect(() => {
    if (getToken()) {
      setState({ kind: "authed" });
      return;
    }
    if (env.isDev && !env.authOrigin) {
      setState({ kind: "dev_fallback" });
      return;
    }
    setState({ kind: "needs_handoff" });
  }, []);

  async function startHandoff() {
    setState({ kind: "checking" });
    try {
      // beginPkceLogin navigates away — never resolves. The catch handles
      // pre-redirect failures (missing config, etc.).
      await beginPkceLogin({
        authOrigin: env.authOrigin,
        clientId: env.oauth.clientId,
        redirectUri: env.oauth.redirectUri,
        returnTo: window.location.pathname + window.location.search,
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function applyDevToken() {
    if (!devTokenInput.trim()) return;
    setDevToken(devTokenInput.trim());
    setState({ kind: "authed" });
  }

  if (state.kind === "authed") return <>{children}</>;

  if (state.kind === "checking") {
    return (
      <main aria-live="polite">
        <p className="muted">Checking authentication…</p>
      </main>
    );
  }

  if (state.kind === "needs_handoff") {
    return (
      <main className="stack-3">
        <h1>Sign in to continue</h1>
        <p>
          You'll be sent to <code>proofofaiwork.com</code> to confirm your account, then bounced
          back here.
        </p>
        <div className="row">
          <button type="button" className="primary" onClick={startHandoff}>
            Continue to sign-in
          </button>
        </div>
      </main>
    );
  }

  if (state.kind === "dev_fallback") {
    return (
      <main className="stack-3">
        <h1>Dev auth fallback</h1>
        <p className="muted">
          <code>VITE_AUTH_ORIGIN</code> is unset. Paste any string to use as a dev bearer token.
          Disabled in production builds.
        </p>
        <input
          type="text"
          value={devTokenInput}
          onChange={(e) => setDevTokenInput(e.target.value)}
          placeholder="dev-token-anything"
          aria-label="Dev token"
          style={{ padding: "var(--space-2)", width: "100%", maxWidth: 480 }}
        />
        <div className="row">
          <button type="button" className="primary" onClick={applyDevToken}>
            Use this token
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="stack-3">
      <h1>Sign-in failed</h1>
      <p className="error">{state.message}</p>
      <div className="row">
        <button type="button" onClick={() => setState({ kind: "needs_handoff" })}>
          Try again
        </button>
      </div>
    </main>
  );
}

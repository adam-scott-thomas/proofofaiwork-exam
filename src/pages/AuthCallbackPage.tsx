/**
 * AuthCallbackPage — landing page for the OAuth 2.1 + PKCE callback.
 *
 * Mounted at /auth/callback. The authorization server redirects the
 * browser here after /authorize with `?code&state` (success) or
 * `?error=...` (failure). On mount we call completePkceLogin which
 * verifies state, exchanges the code at /token, and stores the
 * resulting workbench-scoped Bearer.
 *
 * On success: navigate to the user's original destination (returnTo)
 * or "/".
 * On failure: render an error message + a "Try again" button that
 * re-runs beginPkceLogin.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Footer } from "@/components/Footer";
import { beginPkceLogin, completePkceLogin } from "@/lib/auth";
import { env } from "@/lib/env";
import { useDocumentTitle } from "@/lib/useDocumentTitle";


type State =
  | { kind: "exchanging" }
  | { kind: "error"; message: string };


export function AuthCallbackPage() {
  useDocumentTitle("Signing in…");
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: "exchanging" });

  // React 18 StrictMode mounts effects twice in dev. The PKCE code is
  // single-use server-side, so the second call would always 400. Guard
  // with a ref so we only attempt the exchange once per mount cycle.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    (async () => {
      try {
        const result = await completePkceLogin({
          authOrigin: env.authOrigin,
          clientId: env.oauth.clientId,
          redirectUri: env.oauth.redirectUri,
        });
        navigate(result.returnTo ?? "/", { replace: true });
      } catch (err) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  }, [navigate]);

  async function tryAgain() {
    setState({ kind: "exchanging" });
    try {
      await beginPkceLogin({
        authOrigin: env.authOrigin,
        clientId: env.oauth.clientId,
        redirectUri: env.oauth.redirectUri,
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <>
      <main className="auth-callback stack-3" aria-live="polite">
        {state.kind === "exchanging" && (
          <>
            <h1>Signing in…</h1>
            <p className="muted">Verifying your credentials.</p>
          </>
        )}
        {state.kind === "error" && (
          <>
            <h1>Sign-in failed</h1>
            <p className="error" role="alert">
              {state.message}
            </p>
            <p>
              <button type="button" className="primary" onClick={tryAgain}>
                Try again
              </button>
            </p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

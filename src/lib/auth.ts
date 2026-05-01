/**
 * Auth — workbench-scoped Bearer token in localStorage.
 *
 * Per v2 decision #1:
 *   - Bearer-in-localStorage stays for v1 (no subdomain-cookie refactor).
 *   - Token is minted on proofofaiwork.com via an iframe/popup, posted back to
 *     assessment.proofofaiwork.com via window.postMessage, and stored here.
 *   - WebSocket auth uses the token in the FIRST CLIENT MESSAGE, never the URL.
 *
 * This module is the only place in the frontend that touches localStorage
 * for auth — everything else goes through getToken/setToken/clearToken.
 */

const STORAGE_KEY = "poaw_workbench_token_v1";
const STORAGE_EXP_KEY = "poaw_workbench_token_exp_v1";

// Expected message shape from the auth iframe.
interface AuthHandoffMessage {
  type: "poaw.workbench.token";
  token: string;
  expires_at: string; // ISO-8601
  scope: "workbench";
}

function isAuthHandoffMessage(data: unknown): data is AuthHandoffMessage {
  if (typeof data !== "object" || data === null) return false;
  const m = data as Record<string, unknown>;
  return (
    m.type === "poaw.workbench.token" &&
    typeof m.token === "string" &&
    typeof m.expires_at === "string" &&
    m.scope === "workbench"
  );
}

export function getToken(): string | null {
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    const exp = localStorage.getItem(STORAGE_EXP_KEY);
    if (!token || !exp) return null;
    const expMs = Date.parse(exp);
    // Fail closed on a malformed expiry: NaN <= now is false, which
    // would otherwise treat a corrupted exp as still-valid. Clear and
    // force re-auth instead — corrupt localStorage shouldn't extend
    // a stale token.
    if (Number.isNaN(expMs) || expMs <= Date.now()) {
      clearToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function setToken(token: string, expiresAt: string): void {
  localStorage.setItem(STORAGE_KEY, token);
  localStorage.setItem(STORAGE_EXP_KEY, expiresAt);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_EXP_KEY);
}

/**
 * Open the auth handoff popup on proofofaiwork.com and wait for the
 * postMessage with the workbench-scoped token.
 *
 * Resolves with the token. Rejects on timeout or if the popup is closed
 * before the message arrives.
 *
 * STUB: real handler routes lands Week 2. This implementation works against
 * a real /auth/issue-workbench-token endpoint when one exists; otherwise the
 * promise will time out and the caller should fall back to dev-mode auth.
 */
export async function requestTokenViaIframeHandoff(
  opts: {
    authOrigin: string;
    timeoutMs?: number;
  } = { authOrigin: "" },
): Promise<string> {
  const { authOrigin, timeoutMs = 30_000 } = opts;
  if (!authOrigin) {
    throw new Error("requestTokenViaIframeHandoff: authOrigin not configured");
  }

  const popup = window.open(
    `${authOrigin}/auth/issue-workbench-token?return_to=${encodeURIComponent(window.location.origin)}`,
    "poaw_auth_handoff",
    "width=480,height=640,noopener=no,noreferrer=no",
  );
  if (!popup) {
    throw new Error("Could not open auth popup. Disable popup blocker and retry.");
  }

  return new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Auth handoff timed out."));
    }, timeoutMs);

    function onMessage(ev: MessageEvent): void {
      // Same-origin check: only accept from the auth origin we opened.
      if (ev.origin !== authOrigin) return;
      if (!isAuthHandoffMessage(ev.data)) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      setToken(ev.data.token, ev.data.expires_at);
      try {
        popup?.close();
      } catch {
        /* popup may already be closed */
      }
      resolve(ev.data.token);
    }

    window.addEventListener("message", onMessage);
  });
}

/**
 * For local dev only: stash a fake token so the rest of the app can be
 * exercised before the real handoff endpoint exists. NEVER ship this in prod.
 */
export function setDevToken(token: string): void {
  if (import.meta.env.PROD) {
    throw new Error("setDevToken is not available in production builds.");
  }
  // 1 hour expiry.
  setToken(token, new Date(Date.now() + 60 * 60 * 1000).toISOString());
}

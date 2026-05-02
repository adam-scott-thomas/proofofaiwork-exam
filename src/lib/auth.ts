/**
 * Auth — workbench-scoped Bearer token in localStorage.
 *
 * Per Path B (see CHANGELOG):
 *   - The workbench-scoped token comes from a real OAuth 2.1
 *     Authorization Code + PKCE flow against
 *     proofofaiwork.com/api/v1/oauth/{authorize,token}.
 *   - The token itself is still an opaque DB-backed Bearer (the
 *     backend reuses auth_service.create_session with scope='workbench');
 *     JWT migration is deferred.
 *   - WebSocket auth still puts the token in the FIRST CLIENT MESSAGE,
 *     never the URL.
 *
 * This module is the only place in the frontend that touches localStorage
 * for auth — everything else goes through getToken/setToken/clearToken.
 *
 * PKCE helpers:
 *   - beginPkceLogin() — generates verifier + challenge + state, stores
 *     the verifier in sessionStorage, redirects to the wrapper page on
 *     proofofaiwork.com which forwards to /api/v1/oauth/authorize.
 *   - completePkceLogin() — called by /auth/callback, verifies state,
 *     POSTs code+verifier to /token, calls setToken on success.
 */

const STORAGE_KEY = "poaw_workbench_token_v1";
const STORAGE_EXP_KEY = "poaw_workbench_token_exp_v1";

// Per OAuth 2.1: only S256, never plain.
const CODE_CHALLENGE_METHOD = "S256";

// PKCE state lives in sessionStorage so it survives the cross-origin
// redirect but is gone when the tab closes (verifier replay protection).
const PKCE_VERIFIER_KEY = "poaw_pkce_verifier_v1";
const PKCE_STATE_KEY = "poaw_pkce_state_v1";
const PKCE_RETURN_TO_KEY = "poaw_pkce_return_to_v1";


// --------------------------- token storage --------------------------------


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


// --------------------------- PKCE helpers ---------------------------------


function _b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** RFC 7636 §4.1: 43-octet base64url-no-pad of 32 random bytes. */
function _generateVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return _b64url(bytes);
}

/** RFC 7636 §4.2 S256: BASE64URL(SHA256(ASCII(verifier))). No padding. */
async function _challengeFromVerifier(verifier: string): Promise<string> {
  const ascii = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", ascii.buffer as ArrayBuffer);
  return _b64url(new Uint8Array(digest));
}

/** Cryptographically random 16-byte state, base64url-encoded. */
function _generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return _b64url(bytes);
}

function _clearPkceStorage(): void {
  try {
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(PKCE_STATE_KEY);
    sessionStorage.removeItem(PKCE_RETURN_TO_KEY);
  } catch {
    /* sessionStorage may be unavailable in private browsing edge cases */
  }
}


/**
 * Start the OAuth 2.1 + PKCE login dance.
 *
 * - Generates a verifier (32 random bytes → base64url) and stores it in
 *   sessionStorage so the callback can use it.
 * - Generates a state (16 random bytes → base64url) and stores it for
 *   CSRF protection.
 * - Optionally records `returnTo` so the callback can navigate back to
 *   wherever the user originally tried to go.
 * - Redirects to the proofofaiwork.com wrapper page which attaches the
 *   PoAW Bearer and forwards to /api/v1/oauth/authorize. The wrapper's
 *   final redirect lands on /auth/callback?code=...&state=...
 *
 * Returns Promise<never> because the function navigates away. Callers
 * should `await` it for type-narrowing but it never resolves.
 */
export async function beginPkceLogin(opts: {
  authOrigin: string;
  clientId: string;
  redirectUri: string;
  returnTo?: string;
}): Promise<never> {
  const { authOrigin, clientId, redirectUri, returnTo } = opts;
  if (!authOrigin) throw new Error("beginPkceLogin: authOrigin is required");
  if (!clientId) throw new Error("beginPkceLogin: clientId is required");
  if (!redirectUri) throw new Error("beginPkceLogin: redirectUri is required");

  const verifier = _generateVerifier();
  const state = _generateState();
  const challenge = await _challengeFromVerifier(verifier);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);
  if (returnTo) sessionStorage.setItem(PKCE_RETURN_TO_KEY, returnTo);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: CODE_CHALLENGE_METHOD,
    scope: "workbench",
    state,
  });

  // Wrapper page lives on proofofaiwork.com, attaches the PoAW Bearer
  // it has in its own localStorage, and forwards to the actual
  // /api/v1/oauth/authorize endpoint.
  window.location.assign(`${authOrigin}/oauth/authorize?${params.toString()}`);
  // Unreachable; satisfies the return type and stops downstream code.
  return new Promise<never>(() => {
    /* never resolves */
  });
}


export interface PkceCompletion {
  token: string;
  expiresAt: string;
  returnTo: string | null;
}


/**
 * Finish the PKCE flow — read code+state from the current URL, verify
 * state against the one we stored, exchange code+verifier at /token,
 * call setToken on success.
 *
 * Throws on any failure with a descriptive Error message. ALWAYS clears
 * the sessionStorage PKCE keys before throwing — verifier replay
 * prevention is non-negotiable.
 */
export async function completePkceLogin(opts: {
  authOrigin: string;
  clientId: string;
  redirectUri: string;
}): Promise<PkceCompletion> {
  const { authOrigin, clientId, redirectUri } = opts;

  // 1. Pull what we need from sessionStorage.
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const expectedState = sessionStorage.getItem(PKCE_STATE_KEY);
  const returnTo = sessionStorage.getItem(PKCE_RETURN_TO_KEY);

  // 2. Pull code+state from the URL.
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const oauthError = params.get("error");

  if (oauthError) {
    _clearPkceStorage();
    throw new Error(`OAuth error: ${oauthError}`);
  }

  if (!verifier) {
    _clearPkceStorage();
    throw new Error("missing verifier (sessionStorage cleared between begin and complete)");
  }

  if (!code) {
    _clearPkceStorage();
    throw new Error("missing code in callback URL");
  }

  if (!state || !expectedState || state !== expectedState) {
    _clearPkceStorage();
    throw new Error("state mismatch");
  }

  // 3. Exchange. Form-encoded per RFC 6749 §4.1.3.
  let resp: Response;
  try {
    resp = await fetch(`${authOrigin}/api/v1/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: verifier,
      }).toString(),
    });
  } catch (err) {
    _clearPkceStorage();
    throw new Error(`token exchange network error: ${String(err)}`);
  }

  if (!resp.ok) {
    _clearPkceStorage();
    let msg = `token exchange failed: HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      const errCode = body?.error?.code ?? "unknown";
      msg = `token exchange failed: ${errCode}`;
    } catch {
      /* keep the HTTP-status message */
    }
    throw new Error(msg);
  }

  let body: {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
  };
  try {
    body = await resp.json();
  } catch {
    _clearPkceStorage();
    throw new Error("token exchange returned non-JSON body");
  }

  if (!body.access_token || typeof body.expires_in !== "number") {
    _clearPkceStorage();
    throw new Error("token exchange returned malformed body");
  }

  // 4. Compute expiresAt as ISO from expires_in (seconds).
  const expiresAt = new Date(Date.now() + body.expires_in * 1000).toISOString();
  setToken(body.access_token, expiresAt);

  // 5. Clear PKCE storage on the success path too — verifier is
  // already consumed (the backend popped its Redis entry), so the
  // verifier in sessionStorage is now waste.
  _clearPkceStorage();

  return { token: body.access_token, expiresAt, returnTo };
}


// --------------------------- dev fallback ---------------------------------


/**
 * For local dev only: stash a fake token so the rest of the app can be
 * exercised before the real OAuth flow is wired up. NEVER ship in prod.
 */
export function setDevToken(token: string): void {
  if (import.meta.env.PROD) {
    throw new Error("setDevToken is not available in production builds.");
  }
  // 1 hour expiry.
  setToken(token, new Date(Date.now() + 60 * 60 * 1000).toISOString());
}

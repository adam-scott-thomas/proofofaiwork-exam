/**
 * Boot-time environment validation.
 *
 * Vite inlines VITE_* vars at build time. If a required var is empty
 * (e.g. you forgot to set the GitHub Action variable before a CF Pages
 * deploy), the app builds fine but pages silently misbehave at runtime:
 *
 *   - Empty VITE_PROOF_PUBLIC_KEY → /verify and /p/:id render
 *     "missing public key" on every load.
 *   - Empty VITE_API_BASE_URL → fetch against the page origin, which
 *     usually 404s on /api/v1/workbench/*.
 *
 * This module collects all such issues into a typed list so we can:
 *   1. Warn at app boot in main.tsx (visible in DevTools console).
 *   2. Surface them in a future status page banner.
 *   3. Later: gate the production build itself if a required var is
 *      empty, by importing this from a node script.
 *
 * Pure function, no I/O — just inspects `env` from lib/env.ts.
 */

import { env } from "@/lib/env";

export interface EnvIssue {
  level: "error" | "warning";
  variable: string;
  message: string;
}

/**
 * Inspect the current environment and return any issues found.
 * Returns an empty array when everything is wired correctly.
 *
 * `errors` block production-grade behavior. `warnings` are nice-to-have.
 */
export function checkEnv(): EnvIssue[] {
  const issues: EnvIssue[] = [];

  // VITE_API_BASE_URL — required for any API call. Without it, the API
  // client falls back to window.location.origin which is usually wrong
  // (frontend at assessment.proofofaiwork.com, API at proofofaiwork.com).
  if (!env.apiBaseUrl) {
    issues.push({
      level: "error",
      variable: "VITE_API_BASE_URL",
      message:
        "API base URL is empty. API calls will fall back to the page " +
        "origin and usually 404. Set this in the deploy environment.",
    });
  }

  // VITE_WS_BASE_URL — required for the chat transport. Falls back to
  // ws://current host which is wrong in production.
  if (!env.wsBaseUrl) {
    issues.push({
      level: env.isProd ? "error" : "warning",
      variable: "VITE_WS_BASE_URL",
      message:
        "WebSocket base URL is empty. Chat transport will fall back to " +
        "the page origin's WebSocket host, which is wrong in production.",
    });
  }

  // VITE_PROOF_PUBLIC_KEY — without this, /verify and /p/:id render
  // "missing public key" on every proof view.
  if (!env.proofPublicKey) {
    issues.push({
      level: env.isProd ? "error" : "warning",
      variable: "VITE_PROOF_PUBLIC_KEY",
      message:
        "Ed25519 public key is empty. /verify and /p/:id will fail with " +
        '"missing public key" until this is set to a base64 verifier key.',
    });
  }

  // VITE_AUTH_ORIGIN — OAuth 2.1 + PKCE authorization server origin.
  // beginPkceLogin() redirects here. AuthGate's dev-fallback path
  // accepts any-string-as-token in dev so this is only an error in
  // production builds.
  if (!env.authOrigin && env.isProd) {
    issues.push({
      level: "error",
      variable: "VITE_AUTH_ORIGIN",
      message:
        "Auth origin is empty. beginPkceLogin cannot redirect to the " +
        "authorization server; the candidate flow will be unreachable.",
    });
  }

  // VITE_OAUTH_CLIENT_ID — required by /authorize and /token. Backend
  // rejects unknown client_ids (poaw-workbench-spa is the registered one).
  if (!env.oauth.clientId && env.isProd) {
    issues.push({
      level: "error",
      variable: "VITE_OAUTH_CLIENT_ID",
      message:
        "OAuth client_id is empty. /authorize will be rejected by the " +
        "backend with invalid_client.",
    });
  }

  // VITE_OAUTH_REDIRECT_URI — must match a backend-registered URI exactly.
  // Empty means PKCE round-trips can't complete.
  if (!env.oauth.redirectUri && env.isProd) {
    issues.push({
      level: "error",
      variable: "VITE_OAUTH_REDIRECT_URI",
      message:
        "OAuth redirect_uri is empty. The /authorize call cannot be " +
        "constructed and the SPA cannot receive the callback.",
    });
  }

  return issues;
}

/**
 * Side-effect helper: collects issues and console.warn / console.error
 * each one. Returns the issues so callers can decide whether to render
 * a banner.
 */
export function reportEnvIssues(): EnvIssue[] {
  const issues = checkEnv();
  for (const issue of issues) {
    const fn = issue.level === "error" ? console.error : console.warn;
    fn(`[env] ${issue.variable}: ${issue.message}`);
  }
  return issues;
}

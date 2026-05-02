#!/usr/bin/env node
/**
 * Build-time env guard for production deploys.
 *
 * The boot-time check in src/lib/envValidation.ts catches misconfig in
 * the browser console after a bad deploy lands. By then, users see a
 * broken page. This script runs BEFORE the build and exits non-zero
 * if a required production var is missing.
 *
 * Wire it into CI (cloudflare-pages.yml) as a step before `npm run build`
 * on the production branch. Local dev is unaffected (set
 * SKIP_PROD_ENV_CHECK=1 to bypass for one-off local builds).
 *
 * Required production vars:
 *   - VITE_API_BASE_URL
 *   - VITE_WS_BASE_URL
 *   - VITE_PROOF_PUBLIC_KEY
 *   - VITE_AUTH_ORIGIN
 *
 * Stays in sync with src/lib/envValidation.ts. If you add a required
 * var there, add it here.
 */

const REQUIRED = [
  {
    name: "VITE_API_BASE_URL",
    why: "Frontend talks to /api/v1/workbench/* on this origin.",
  },
  {
    name: "VITE_WS_BASE_URL",
    why: "WebSocket transport for chat. Wrong host = no chat.",
  },
  {
    name: "VITE_PROOF_PUBLIC_KEY",
    why: "Ed25519 verifier key. /verify and /p/:id render \"missing public key\" without it.",
  },
  {
    name: "VITE_AUTH_ORIGIN",
    why: "OAuth 2.1 + PKCE authorization server origin. beginPkceLogin redirects here; candidate flow unreachable without it.",
  },
  {
    name: "VITE_OAUTH_CLIENT_ID",
    why: "OAuth client_id sent to /authorize and /token. Backend rejects unknown clients with invalid_client.",
  },
  {
    name: "VITE_OAUTH_REDIRECT_URI",
    why: "Where the AS redirects after /authorize. Must match a backend-registered URI exactly.",
  },
];


if (process.env.SKIP_PROD_ENV_CHECK === "1") {
  console.warn("[check-prod-env] SKIP_PROD_ENV_CHECK=1 set — skipping guard");
  process.exit(0);
}

const missing = [];
for (const { name, why } of REQUIRED) {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    missing.push({ name, why });
  }
}

if (missing.length === 0) {
  console.log("[check-prod-env] all required production vars present");
  process.exit(0);
}

console.error("\n[check-prod-env] BUILD HALTED — missing required production env vars:\n");
for (const { name, why } of missing) {
  console.error(`  - ${name}`);
  console.error(`    ${why}\n`);
}
console.error(
  "Set these in the deploy environment (GitHub repository variables for the Cloudflare Pages workflow,\n" +
    "or your own .env for a local prod-mode build).\n" +
    "Bypass for a one-off local build: SKIP_PROD_ENV_CHECK=1 npm run build:prod\n",
);
process.exit(1);

/**
 * Typed environment access. All VITE_* vars surfaced through this module.
 *
 * Vite inlines these at build time, so anything readable here is also
 * readable in the browser. Treat all of these as PUBLIC.
 */

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL ?? "",
  authOrigin: import.meta.env.VITE_AUTH_ORIGIN ?? "",
  // Ed25519 public key (base64, optionally unpadded) used by lib/verify.ts
  // to validate proof signatures offline. Baked at build time; explicitly
  // public per docs/WORKBENCH_SECURITY_PRIVACY_PLAN_v2.
  proofPublicKey: import.meta.env.VITE_PROOF_PUBLIC_KEY ?? "",
  features: {
    verifiedEnabled: import.meta.env.VITE_FEATURE_VERIFIED_ENABLED === "true",
  },
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? "",
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
} as const;

export type Env = typeof env;

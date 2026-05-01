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
  features: {
    verifiedEnabled: import.meta.env.VITE_FEATURE_VERIFIED_ENABLED === "true",
  },
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? "",
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
} as const;

export type Env = typeof env;

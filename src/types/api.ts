/**
 * API types — manually maintained to mirror backend Pydantic schemas.
 *
 * v1 deliberately keeps this hand-written so we can ship without a codegen
 * pipeline. v2 (Week 8+) should swap to OpenAPI codegen against the real
 * /openapi.json. Until then: when a backend schema changes, update this file
 * AND the corresponding Pydantic class in poaw/workbench/schemas/.
 *
 * Source of truth: src/poaw/workbench/schemas/*.py in the backend repo.
 */

// ---------- Discriminators / enums ----------

export type SessionTier = "open" | "verified";

// Mirror of the values written by services.sessions in the backend.
// `ready` is the post-create state for both Open (no gates) and Verified
// (gates already passed) — see services/sessions.py:191. `created` is
// reserved for a granular pre-ready FSM that v1 skipped (review #4).
export type SessionState =
  | "ready"
  | "created"
  | "in_progress"
  | "submitted"
  | "graded"
  | "issued"
  | "withdrawn"
  | "revoked"
  | "expired";

export type SectionId = "diagnose" | "perform" | "repair";

export type SectionState = "not_started" | "in_progress" | "submitted" | "graded" | "expired";

// ---------- OAuth 2.1 + PKCE ----------
//
// Mirrors poaw.api.routers.oauth.token's response shape. The SPA never
// constructs this directly — it's the parsed body of POST /api/v1/oauth/token.
export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
}

// ---------- Errors ----------

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------- Sessions ----------

export interface CreateSessionIn {
  tier: SessionTier;
  consent_meta: { accepted_at: string; version: string };
  payment_intent_id?: string | null;
  identity_verification_id?: string | null;
  fingerprint?: Record<string, unknown> | null;
}

export interface CreateSessionOut {
  session_id: string;
  tier: SessionTier;
  state: SessionState;
  version_string: string;
}

export interface StartSectionOut {
  section_run_id: string;
  variant_id: string;
  section: SectionId;
  section_budget_s: number;
  started_at: string; // ISO-8601
}

export interface SubmitSectionIn {
  submission: {
    final_artifact?: string;
    verification_notes?: string;
    assumptions?: string;
    reflection?: string;
    [key: string]: unknown;
  };
}

export interface SubmitSectionOut {
  section_run_id: string;
  section: SectionId;
  state: SectionState;
  submitted_at: string;
  time_used_s: number;
}

// ---------- Models endpoint ----------

export interface ModelDescriptor {
  alias: string;
  family: string;
  display_name: string;
  available_for_tier: SessionTier[];
}

export interface ListModelsOut {
  models: ModelDescriptor[];
}

// ---------- Health (rolled-up workbench health) ----------
//
// Mirrors the response shape from
// `poaw.workbench.routers.health.workbench_health`: a flat `checks`
// dict + lists of blocking_failures / degraded keys. Frontend code
// previously declared a `{ enabled, verified_enabled, components, ... }`
// shape that the backend never returned — those fields rendered as
// `undefined` against a real backend.
//
// Each entry in `checks` is either:
//  - "ok"
//  - "not_required"           (Verified-only configs while VERIFIED_ENABLED=false)
//  - "unknown"                (celery heartbeat with no recent ping)
//  - "error: <reason>"        (a string starting with "error:")
//  - boolean                  (wb_enabled, wb_verified_enabled)
//  - migration revision id    (migration_head, migration_current)

export type HealthCheckValue = string | boolean;

export interface WorkbenchHealthChecks {
  postgres: HealthCheckValue;
  redis: HealthCheckValue;
  celery_heartbeat: HealthCheckValue;
  s3_config: HealthCheckValue;
  anthropic_config: HealthCheckValue;
  openai_config: HealthCheckValue;
  plaid_config: HealthCheckValue;
  square_config: HealthCheckValue;
  wb_enabled: HealthCheckValue;
  wb_verified_enabled: HealthCheckValue;
  migration_head: HealthCheckValue;
  migration_current: HealthCheckValue;
  [key: string]: HealthCheckValue;
}

export interface WorkbenchHealthOut {
  status: "ok" | "degraded" | "failed";
  ts: string; // ISO-8601
  checks: WorkbenchHealthChecks;
  blocking_failures: string[];
  degraded: string[];
}

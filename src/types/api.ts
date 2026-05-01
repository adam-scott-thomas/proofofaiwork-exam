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

export type SessionState =
  | "created"
  | "in_progress"
  | "submitted"
  | "graded"
  | "issued"
  | "withdrawn"
  | "revoked"
  | "expired";

export type SectionId = "diagnose" | "perform" | "repair";

export type SectionState =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "graded"
  | "expired";

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

export interface WorkbenchHealthOut {
  status: "ok" | "degraded" | "down";
  enabled: boolean;
  verified_enabled: boolean;
  components: {
    db: "ok" | "down";
    redis: "ok" | "down";
    celery: "ok" | "down";
    storage: "ok" | "down";
    llm: "ok" | "down";
    plaid?: "ok" | "down" | "not_configured";
  };
  migration_version: string | null;
}

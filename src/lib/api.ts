/**
 * Typed API client for the Workbench backend.
 *
 * Surface is intentionally small: each backend route gets one named export.
 * No global axios-style interceptor magic — explicit beats clever for v1.
 *
 * Auth: every call attaches the workbench-scoped Bearer token from
 * src/lib/auth.ts. If no token exists, calls fail with ApiError(401, ...).
 *
 * Errors: backend returns { error: { code, message, details } }. We parse and
 * raise as a typed `ApiError` so callers can branch on `.code`.
 */

import { getToken } from "@/lib/auth";
import type { ProofEnvelope } from "@/lib/verify";
import {
  ApiError,
  type ApiErrorBody,
  type CreateSessionIn,
  type CreateSessionOut,
  type ListModelsOut,
  type StartSectionOut,
  type SubmitSectionIn,
  type SubmitSectionOut,
  type WorkbenchHealthOut,
  type SectionId,
} from "@/types/api";

function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

const API_PREFIX = "/api/v1/workbench";

// ---------- Internal request helper ----------

interface RequestOpts {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  signal?: AbortSignal;
  // If true, do NOT attach Authorization header — used for the public proofs
  // endpoint and the public health endpoint.
  unauthenticated?: boolean;
  // If set, use this prefix instead of API_PREFIX. Used by /health/workbench
  // which lives outside the /workbench namespace.
  prefixOverride?: string;
}

async function request<T>(opts: RequestOpts): Promise<T> {
  const prefix = opts.prefixOverride ?? API_PREFIX;
  const url = `${resolveApiBaseUrl()}${prefix}${opts.path}`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };

  if (!opts.unauthenticated) {
    const token = getToken();
    if (!token) {
      throw new ApiError(
        401,
        "no_token",
        "No workbench-scoped token in localStorage. Authenticate first.",
      );
    }
    headers.authorization = `Bearer ${token}`;
  }

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: opts.method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      // No cookies. v1 is Bearer-only.
      credentials: "omit",
    });
  } catch (err) {
    // Network-level failure. Translate to a uniform ApiError so callers
    // don't need to know about TypeError vs DOMException.
    throw new ApiError(0, "network_error", `Network error: ${String(err)}`);
  }

  // Successful no-content response.
  if (resp.status === 204) {
    return undefined as unknown as T;
  }

  let json: unknown = null;
  try {
    json = await resp.json();
  } catch {
    // Some 5xx pages serve HTML — leave json null.
  }

  if (!resp.ok) {
    const body = json as Partial<ApiErrorBody> | null;
    const e = body?.error;
    throw new ApiError(
      resp.status,
      e?.code ?? "unknown_error",
      e?.message ?? `${resp.status} ${resp.statusText}`,
      e?.details ?? {},
    );
  }

  return json as T;
}

// ---------- Public endpoints ----------

export async function getWorkbenchHealth(signal?: AbortSignal): Promise<WorkbenchHealthOut> {
  return request<WorkbenchHealthOut>({
    method: "GET",
    path: "/workbench",
    prefixOverride: "/api/v1/health",
    unauthenticated: true,
    signal,
  });
}

export async function listModels(signal?: AbortSignal): Promise<ListModelsOut> {
  // Server is source of truth for model availability. Frontend NEVER
  // hardcodes model aliases (per v2 decision #10).
  return request<ListModelsOut>({
    method: "GET",
    path: "/models",
    signal,
  });
}

// ---------- Session lifecycle ----------

export async function createSession(
  body: CreateSessionIn,
  signal?: AbortSignal,
): Promise<CreateSessionOut> {
  return request<CreateSessionOut>({
    method: "POST",
    path: "/sessions",
    body,
    signal,
  });
}

export async function getSession(sessionId: string, signal?: AbortSignal): Promise<unknown> {
  // Stubbed on backend until Week 2; type stays unknown for now.
  return request<unknown>({
    method: "GET",
    path: `/sessions/${sessionId}`,
    signal,
  });
}

export async function getSessionState(sessionId: string, signal?: AbortSignal): Promise<unknown> {
  return request<unknown>({
    method: "GET",
    path: `/sessions/${sessionId}/state`,
    signal,
  });
}

export async function startSession(sessionId: string, signal?: AbortSignal): Promise<unknown> {
  return request<unknown>({
    method: "POST",
    path: `/sessions/${sessionId}/start`,
    signal,
  });
}

export async function submitSession(sessionId: string, signal?: AbortSignal): Promise<unknown> {
  return request<unknown>({
    method: "POST",
    path: `/sessions/${sessionId}/submit`,
    signal,
  });
}

// ---------- Section lifecycle ----------

export async function startSection(
  sessionId: string,
  section: SectionId,
  signal?: AbortSignal,
): Promise<StartSectionOut> {
  return request<StartSectionOut>({
    method: "POST",
    path: `/sessions/${sessionId}/sections/${section}/start`,
    signal,
  });
}

export async function submitSection(
  sessionId: string,
  section: SectionId,
  body: SubmitSectionIn,
  signal?: AbortSignal,
): Promise<SubmitSectionOut> {
  return request<SubmitSectionOut>({
    method: "POST",
    path: `/sessions/${sessionId}/sections/${section}/submit`,
    body,
    signal,
  });
}

// ---------- Results / proofs ----------

export async function getResults(sessionId: string, signal?: AbortSignal): Promise<unknown> {
  return request<unknown>({
    method: "GET",
    path: `/results/${sessionId}`,
    signal,
  });
}

export async function getProof(proofId: string, signal?: AbortSignal): Promise<ProofEnvelope> {
  // Public endpoint — no auth required.
  // Backend: poaw.workbench.routers.proof.get_proof returns
  // PublicProofOut on 200, GenericRevokedOut with HTTP 410 on revoked,
  // and standard error envelope on 404. The 410 path raises ApiError
  // with status=410, code="proof_unavailable" via the request helper —
  // callers check that and render the generic "no longer available"
  // message; the body is intentionally identical for every revocation
  // reason per plan §G.6.
  return request<ProofEnvelope>({
    method: "GET",
    path: `/proofs/${proofId}`,
    unauthenticated: true,
    signal,
  });
}

// Re-export for convenience.
export { ApiError };

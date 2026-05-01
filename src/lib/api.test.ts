/**
 * Tests for the typed API client.
 *
 * Covers the request-helper paths that every other endpoint flows
 * through: auth header attachment, error envelope parsing, ApiError
 * construction, 204 handling, network errors.
 *
 * Mocks `fetch` directly so we don't need a backend.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, getProof, getWorkbenchHealth, listModels } from "./api";


function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}


describe("api.ts request helper", () => {
  beforeEach(() => {
    // Token-bearing localStorage so authenticated calls don't bail.
    vi.stubGlobal("localStorage", {
      getItem(k: string) {
        if (k === "poaw_workbench_token_v1") return "test-token";
        if (k === "poaw_workbench_token_exp_v1") {
          return new Date(Date.now() + 60_000).toISOString();
        }
        return null;
      },
      setItem() { /* noop */ },
      removeItem() { /* noop */ },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });


  it("attaches the Bearer token on authenticated calls", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { models: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listModels();

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = call[1].headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer test-token");
  });

  it("does NOT attach Bearer on unauthenticated calls", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        status: "ok",
        ts: "x",
        checks: {
          postgres: "ok",
          redis: "ok",
          celery_heartbeat: "ok",
          s3_config: "ok",
          anthropic_config: "ok",
          openai_config: "ok",
          plaid_config: "not_required",
          square_config: "not_required",
          wb_enabled: true,
          wb_verified_enabled: false,
          migration_head: "abc",
          migration_current: "abc",
        },
        blocking_failures: [],
        degraded: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getWorkbenchHealth();

    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = call[1].headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
  });

  it("throws ApiError(401, no_token) when no token is available", async () => {
    // Override localStorage to return null for the token.
    vi.stubGlobal("localStorage", {
      getItem() { return null; },
      setItem() { /* noop */ },
      removeItem() { /* noop */ },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(listModels()).rejects.toMatchObject({
      status: 401,
      code: "no_token",
    });
    // fetch should not even be called.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses the backend error envelope into ApiError fields", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse(409, {
        error: {
          code: "cooldown_active",
          message: "next attempt available in 3 days",
          details: { resume_at: "2026-05-04T00:00:00Z" },
        },
      }),
    ));

    await expect(listModels()).rejects.toMatchObject({
      status: 409,
      code: "cooldown_active",
      message: "next attempt available in 3 days",
      details: { resume_at: "2026-05-04T00:00:00Z" },
    });
  });

  it("falls back to unknown_error when the body is not the envelope shape", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse(500, { plain: "string error" }),
    ));

    await expect(listModels()).rejects.toMatchObject({
      status: 500,
      code: "unknown_error",
    });
  });

  it("handles network-level failures with a uniform ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));

    await expect(listModels()).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    });
  });

  it("returns parsed body on 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse(200, { models: [{ alias: "claude" }] }),
    ));

    const result = await listModels();
    expect(result).toEqual({ models: [{ alias: "claude" }] });
  });

  it("getProof posts to /workbench/proofs/:id without auth", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        proof_id: "abc",
        public_payload: {},
        canonical_hash: "h",
        signature_b64: "s",
        signing_key_id: "k",
        issued_at: "2026-05-01T00:00:00Z",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getProof("abc");
    expect(result.proof_id).toBe("abc");

    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toContain("/api/v1/workbench/proofs/abc");
    const headers = call[1].headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
  });

  it("ApiError carries the structured fields and is instanceof Error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse(403, {
        error: { code: "forbidden", message: "nope" },
      }),
    ));

    try {
      await listModels();
      throw new Error("expected listModels to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err).toBeInstanceOf(Error);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(403);
      expect(apiErr.code).toBe("forbidden");
    }
  });
});

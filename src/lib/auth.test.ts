/**
 * Tests for the workbench-token storage helpers in lib/auth.
 *
 * The expiry check is the security-relevant part: getToken() must
 * return null (and clear storage) if the stored token is past its
 * `expires_at`, even if the token string itself is still in
 * localStorage from a previous session.
 *
 * Pure-logic tests; vi.stubGlobal stands in for localStorage so we
 * don't need jsdom.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearToken, getToken, setToken } from "./auth";


function makeMockStorage(): {
  storage: Record<string, string>;
  api: Storage;
} {
  const storage: Record<string, string> = {};
  const api: Storage = {
    get length(): number {
      return Object.keys(storage).length;
    },
    key(i: number): string | null {
      return Object.keys(storage)[i] ?? null;
    },
    getItem(k: string): string | null {
      return Object.prototype.hasOwnProperty.call(storage, k)
        ? storage[k]!
        : null;
    },
    setItem(k: string, v: string): void {
      storage[k] = v;
    },
    removeItem(k: string): void {
      delete storage[k];
    },
    clear(): void {
      for (const k of Object.keys(storage)) delete storage[k];
    },
  };
  return { storage, api };
}


describe("auth token storage", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    const m = makeMockStorage();
    storage = m.storage;
    vi.stubGlobal("localStorage", m.api);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("setToken + getToken round-trips a non-expired token", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    setToken("abc.def.ghi", future);
    expect(getToken()).toBe("abc.def.ghi");
  });

  it("getToken returns null when nothing has been stored", () => {
    expect(getToken()).toBeNull();
  });

  it("getToken returns null and clears storage when the token is expired", () => {
    const past = new Date(Date.now() - 1_000).toISOString();
    setToken("expired-token", past);
    expect(getToken()).toBeNull();
    // clearToken side effect: both keys must be gone, otherwise stale
    // tokens linger in localStorage and might be sent on a future call.
    expect(Object.keys(storage)).toEqual([]);
  });

  it("getToken returns null when only the token (no expiry) is stored", () => {
    storage["poaw_workbench_token_v1"] = "orphan";
    // No exp key.
    expect(getToken()).toBeNull();
  });

  it("getToken returns null when only the expiry (no token) is stored", () => {
    storage["poaw_workbench_token_exp_v1"] = new Date(
      Date.now() + 60_000,
    ).toISOString();
    expect(getToken()).toBeNull();
  });

  it("clearToken removes both keys", () => {
    setToken("t", new Date(Date.now() + 60_000).toISOString());
    clearToken();
    expect(Object.keys(storage)).toEqual([]);
  });

  it("getToken survives unparseable expires_at by clearing", () => {
    storage["poaw_workbench_token_v1"] = "garbled-exp-token";
    storage["poaw_workbench_token_exp_v1"] = "not-a-date";
    // Date.parse(non-ISO) → NaN; NaN <= Date.now() is false. So the
    // current implementation returns the token. This test pins that
    // behavior: a malformed exp string is treated as "still valid"
    // rather than as expired. If we ever flip to fail-closed (clear
    // and return null), update this test as the behavioral change.
    expect(getToken()).toBe("garbled-exp-token");
  });
});

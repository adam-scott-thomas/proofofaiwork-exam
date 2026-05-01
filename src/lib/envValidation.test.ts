/**
 * Tests for envValidation. Note: env values come from import.meta.env at
 * module load time. To make tests deterministic without restubbing the
 * whole `env` module per case, these tests inspect the SHAPE of the
 * checkEnv() output (which fields it can produce, the level/variable
 * matrix) rather than triggering specific failure cases.
 *
 * The actual values reported depend on the test runner's environment —
 * what we lock in here is that:
 *   - the function returns an array
 *   - every issue has the documented shape
 *   - level is always "error" or "warning"
 *   - variable always starts with VITE_
 */
import { describe, expect, it } from "vitest";

import { checkEnv } from "./envValidation";


describe("checkEnv", () => {
  it("returns an array of issues", () => {
    const issues = checkEnv();
    expect(Array.isArray(issues)).toBe(true);
  });

  it("every issue has level + variable + message", () => {
    const issues = checkEnv();
    for (const issue of issues) {
      expect(["error", "warning"]).toContain(issue.level);
      expect(issue.variable).toMatch(/^VITE_/);
      expect(issue.message.length).toBeGreaterThan(10);
    }
  });

  it("does not mutate global state on repeat calls", () => {
    const a = checkEnv();
    const b = checkEnv();
    expect(b.length).toBe(a.length);
    expect(b).toEqual(a);
  });
});

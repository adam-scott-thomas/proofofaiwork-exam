/**
 * Tests mirror tests/workbench/proof/test_canonical.py on the Python side.
 *
 * These are the BYTE-IDENTICAL invariant — if JS canonical and Python
 * canonical diverge, every previously-signed proof stops verifying.
 * That's the security regression guard. Don't relax these without
 * also relaxing the Python side, and only via a coordinated revision
 * bump (see docs/WORKBENCH_IMPLEMENTATION_PLAN_v2 §G.3).
 */
import { describe, expect, it } from "vitest";

import { CanonicalError, canonicalize } from "./canonical";

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe("canonicalize", () => {
  it("simple object — keys sorted", () => {
    expect(decode(canonicalize({ b: 1, a: 2 }))).toBe('{"a":2,"b":1}');
  });

  it("nested objects — keys sorted recursively", () => {
    const out = decode(canonicalize({ z: { y: 1, x: 2 }, a: [3, 2, 1] }));
    expect(out).toBe('{"a":[3,2,1],"z":{"x":2,"y":1}}');
  });

  it("no insignificant whitespace", () => {
    const out = decode(canonicalize({ a: 1, b: [2, 3] }));
    expect(out).not.toContain(" ");
    expect(out).not.toContain("\n");
    expect(out).not.toContain("\t");
  });

  it("array order preserved", () => {
    expect(decode(canonicalize([3, 1, 2]))).toBe("[3,1,2]");
  });

  it("Unicode kept as UTF-8 (no \\uXXXX escapes for printable)", () => {
    const out = decode(canonicalize({ name: "Adam Thomas — verified" }));
    expect(out).toContain("Adam Thomas — verified");
    // No \\u escapes for printable Unicode (matches Python's ensure_ascii=False)
    expect(out).not.toMatch(/\\u00[a-f0-9]{2}/i);
  });

  it("booleans + null", () => {
    expect(decode(canonicalize({ a: true, b: false, c: null }))).toBe(
      '{"a":true,"b":false,"c":null}',
    );
  });

  it("empty object + array", () => {
    expect(decode(canonicalize({}))).toBe("{}");
    expect(decode(canonicalize([]))).toBe("[]");
  });

  it("integer no decimal", () => {
    expect(decode(canonicalize({ score: 100 }))).toBe('{"score":100}');
  });

  it("float REJECTED by policy", () => {
    expect(() => canonicalize({ x: 1.5 })).toThrow(CanonicalError);
  });

  it("NaN rejected", () => {
    expect(() => canonicalize(NaN)).toThrow(CanonicalError);
  });

  it("Infinity rejected", () => {
    expect(() => canonicalize(Infinity)).toThrow(CanonicalError);
  });

  it("Date rejected — caller converts to ISO string first", () => {
    expect(() => canonicalize({ d: new Date() })).toThrow(CanonicalError);
  });

  it("Set rejected", () => {
    expect(() => canonicalize(new Set([1, 2, 3]))).toThrow(CanonicalError);
  });

  it("Map rejected", () => {
    expect(() => canonicalize(new Map([["a", 1]]))).toThrow(CanonicalError);
  });

  it("repeatable byte-for-byte", () => {
    const payload = {
      v: 1,
      proof_id: "abc",
      scores: { composite: 73, dimensions: { d1: 80, d2: 70 } },
      tags: ["a", "b", "c"],
    };
    const a = decode(canonicalize(payload));
    const b = decode(canonicalize(payload));
    expect(a).toBe(b);
  });

  it("dict literal order doesn't matter", () => {
    const a = decode(canonicalize({ a: 1, b: 2 }));
    const b = decode(canonicalize({ b: 2, a: 1 }));
    expect(a).toBe(b);
  });

  // Pinned test vector — an exact reproduction expected to match Python
  // tests/workbench/proof/test_canonical.py's `test_repeatable_byte_for_byte`.
  // If these strings ever diverge across languages, signatures silently
  // fail to verify. Treat any change here as a security regression.
  it("pinned test vector matches Python (regression guard)", () => {
    const payload = {
      v: 1,
      proof_id: "abc",
      scores: { composite: 73, dimensions: { d1: 80, d2: 70 } },
      tags: ["a", "b", "c"],
    };
    const expected =
      '{"proof_id":"abc","scores":{"composite":73,"dimensions":' +
      '{"d1":80,"d2":70}},"tags":["a","b","c"],"v":1}';
    expect(decode(canonicalize(payload))).toBe(expected);
  });
});

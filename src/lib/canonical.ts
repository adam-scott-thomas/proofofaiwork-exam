/**
 * Canonical JSON for proof verification.
 *
 * Mirrors the Python canonicalize() in poaw/workbench/proof/canonical.py.
 * The two MUST produce byte-identical output for the same payload — that's
 * the security invariant; if these drift, signatures won't verify and
 * legitimate proofs will start failing.
 *
 * Rules (RFC 8785-ish):
 *   - UTF-8 output, no BOM
 *   - Object keys sorted lexicographically (by codepoint)
 *   - No insignificant whitespace anywhere
 *   - Strings escaped per RFC 8259 (no \uXXXX for printable ASCII)
 *   - Integers as `123` (no decimal point); floats are not used
 *   - Booleans `true` / `false`; null `null`
 *   - Arrays preserve element order
 *
 * Floats are REJECTED (matches the Python contract — proof payloads use
 * ints + ISO-8601 strings; float drift kills hashing).
 */

export class CanonicalError extends Error {}

export function canonicalize(value: unknown): Uint8Array {
  return new TextEncoder().encode(stringify(value));
}

function stringify(v: unknown): string {
  if (v === null) return "null";
  if (v === true) return "true";
  if (v === false) return "false";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number") {
    if (!Number.isFinite(v)) {
      throw new CanonicalError(`non-finite number: ${v}`);
    }
    if (!Number.isInteger(v)) {
      // Floats are forbidden — proof payloads use integers + strings only.
      throw new CanonicalError(`floats are not canonical: ${v}`);
    }
    return v.toString(10);
  }
  if (Array.isArray(v)) {
    return "[" + v.map(stringify).join(",") + "]";
  }
  if (typeof v === "object") {
    // ArrayBuffers, Maps, Sets, Dates, RegExps etc. all reject — caller
    // should convert to plain JSON-shaped values first.
    if (
      v instanceof Date ||
      v instanceof Map ||
      v instanceof Set ||
      v instanceof RegExp ||
      ArrayBuffer.isView(v)
    ) {
      throw new CanonicalError(`non-canonical type: ${(v as object).constructor.name}`);
    }
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort(); // codepoint sort
    const parts: string[] = [];
    for (const k of keys) {
      parts.push(JSON.stringify(k) + ":" + stringify(obj[k]));
    }
    return "{" + parts.join(",") + "}";
  }
  throw new CanonicalError(`non-canonical type: ${typeof v}`);
}

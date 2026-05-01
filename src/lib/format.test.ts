import { describe, expect, it } from "vitest";

import { formatIssuedAt } from "./format";


describe("formatIssuedAt", () => {
  it("renders a human-readable date for a valid ISO timestamp", () => {
    const r = formatIssuedAt("2026-05-01T16:09:32Z");
    // Locale-dependent text — assert structure not exact bytes.
    expect(r.display).toMatch(/2026/);
    expect(r.machine).toBe("2026-05-01T16:09:32Z");
  });

  it("falls back to the raw string on unparseable input", () => {
    const r = formatIssuedAt("not-a-date");
    expect(r.display).toBe("not-a-date");
    expect(r.machine).toBe("not-a-date");
  });

  it("renders an em-dash when given empty/null/undefined", () => {
    expect(formatIssuedAt("").display).toBe("—");
    expect(formatIssuedAt(null).display).toBe("—");
    expect(formatIssuedAt(undefined).display).toBe("—");
    expect(formatIssuedAt("").machine).toBe("");
  });
});

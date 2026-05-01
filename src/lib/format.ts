/**
 * Small, no-dep formatting helpers. These render dates and numbers in
 * human terms while preserving the underlying ISO/numeric string in
 * `<time datetime>`/`title` attributes for machine consumption.
 *
 * No internationalization is configured yet — `Intl` falls back to the
 * browser's default locale. Public proof pages render the same data
 * regardless of viewer, so per-viewer locale is fine.
 */

/**
 * Render an ISO-8601 timestamp as a human-readable date with the absolute
 * timestamp preserved in the title for tooltip + accessibility.
 *
 * Bad input (non-ISO string, NaN, null) returns the original string so
 * the proof page never blanks out on a malformed payload.
 */
export function formatIssuedAt(iso: string | null | undefined): {
  display: string;
  machine: string;
} {
  if (typeof iso !== "string" || iso.length === 0) {
    return { display: "—", machine: "" };
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return { display: iso, machine: iso };
  }
  const d = new Date(ms);
  // Locale-aware long date + short time, e.g. "May 1, 2026, 4:09 PM".
  const display = d.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return { display, machine: iso };
}

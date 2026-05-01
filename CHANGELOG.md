# Changelog

All notable changes to `proofofaiwork-exam` (the PoAW Exam frontend).

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions per [SemVer](https://semver.org/) once we cut v0.1.0.

## [Unreleased]

### Added

- `/pricing` page with Open vs Verified comparison table, Verified gated
  as "Available Week 10" per Plan §J Week 6 acceptance.
- `/privacy` page with verbatim consent text from
  `WORKBENCH_SECURITY_PRIVACY_PLAN_v2` §2.1/§2.2 plus data inventory,
  retention, DSAR rights, Plaid disclosure. GDPR/CCPA section flagged
  ADAM-REVIEW pending lawyer per §7.
- Public proof page (`/p/:id`): "Share this proof" section with
  `<CopyButton>` for one-click URL copy. Dynamic `<title>` showing
  `<name> — <score>/100` for shared links.
- Standalone offline verifier (`/verify`) with paste/drag-drop and
  public-key override.
- Shared `<Footer>` component across all public pages: Product,
  Verification, Legal columns.
- Per-page document titles via `useDocumentTitle` hook.
- OpenGraph + Twitter card meta in `index.html`.
- `public/favicon.svg`, `public/robots.txt` (Disallow: / pre-launch).
- `SECURITY.md` disclosure policy with 3/7/60-day SLA.
- `CONTRIBUTING.md` with high-stakes-path guidance.
- `.github/pull_request_template.md` with per-area checklist.
- `.github/dependabot.yml` weekly with grouped minor/patch bumps and
  pinned `@stablelib/ed25519` major.
- `.prettierrc.json` + `.editorconfig`.
- npm scripts: `check:contract`, `check:env`, `check:all` (lint +
  typecheck + vitest + contract drift).
- `scripts/check-prod-env.mjs`: build-time guard halts deploys with
  missing required `VITE_*` vars. Wired into `build:prod` and CI.
- `scripts/check-contract.mjs`: parses backend `constants.py` and
  asserts 26 frontend-expected literals match.
- Boot-time `reportEnvIssues()` in `main.tsx` surfaces missing env
  vars in DevTools console.
- Vitest CI step runs on every PR; the canonical-JSON pinned vector
  + verify round-trip become signature-drift regression guards.
- ESLint CI step.

### Changed

- README rewritten from Week-1 scaffold copy to current state.
- WS keepalive: transport now auto-replies to server pings with pong
  (echoing `server_ts` → `client_ts`). Was previously passed through
  to consumers, which would have closed connections every ~35s.
- `PublicProofPage` now uses `getProof()` from `lib/api` instead of
  raw fetch — gets typed `ApiError`, structured envelope parsing, and
  proper `AbortController` cancellation.
- `tsc -b` runs with `noEmit: true` (vite handles bundling); was
  emitting `.js` files into `src/`.

### Fixed

- **Auth fail-closed on malformed `expires_at`.** Corrupted
  localStorage previously slipped a stale token through because
  `Date.parse(garbage)` returns NaN and `NaN <= now` is false. Now
  clears and forces re-auth.
- **`CONSENT_VERSION` drift.** Frontend was tagging `consent_meta` rows
  with `"v2.1"` (the exam version) instead of the backend's
  `"wb-consent-2.0"` consent version — silent audit-trail breakage.
- **`SessionState` missed `"ready"`.** Backend creates sessions with
  `state="ready"`; frontend type union didn't include it, so any TS
  narrowing on a fresh session would silently miss.
- **`WorkbenchHealthOut` shape didn't match what backend returns.**
  Frontend declared `{ enabled, verified_enabled, components, ... }`
  while backend returns `{ checks: { wb_enabled, ... }, status,
  blocking_failures, degraded }`. LandingPage was rendering
  `undefined` against any real backend.
- WCAG 2.2 AA cleanups: explicit `<label htmlFor>` on Verify form
  inputs, `scope="col"` on Privacy data tables, `<button disabled>`
  for Pricing's "coming soon" CTA, `:focus-visible` on interactive
  elements.

### Security

- Build now halts on missing `VITE_PROOF_PUBLIC_KEY` (and the other
  three required vars). Previously the bundle would build and
  silently render "missing public key" on every `/verify` and
  `/p/:id` view.
- CSP, HSTS, frame-ancestors none, and Permissions-Policy
  (`camera=(self), microphone=()`) shipped via `public/_headers`.

### Notes

- 51 vitest cases across 7 test files. Notable coverage: pinned
  byte-vector cross-language canonical-JSON regression, Ed25519
  round-trip + tamper detection, WS keepalive, API request helper
  (auth header / error envelope / network errors), token-expiry
  helpers including the new fail-closed contract.
- Contract drift discoveries logged in commit history; root-cause
  guard is `scripts/check-contract.mjs`.

[Unreleased]: https://github.com/adam-scott-thomas/proofofaiwork-exam/compare/HEAD~30...HEAD

# Contributing

Until the public Open launch (Plan §J Week 8), this repo is closed to
external contributions. After that, the rules below apply.

## Quick start

```bash
npm install
cp .env.example .env.local       # edit VITE_API_BASE_URL etc.

# Generate a dev Ed25519 keypair so /verify and /p/:id work locally:
npm run gen:devkey
# Paste the printed VITE_PROOF_PUBLIC_KEY into .env.local
# Paste the printed WB_PROOF_SIGNING_KEY into the backend's .env

npm run dev                      # http://localhost:5173

# Pre-PR sweep — lint + typecheck + vitest + contract drift:
BACKEND_REPO_PATH=/abs/path/to/ProofOfAIWork npm run check:all

# Or individually:
npm run lint
npm run typecheck
npm test
npm run build
```

## Branch and commit conventions

- Land work via `feature/...` PRs against `main`.
- Commit messages follow Conventional Commits (`feat:`, `fix:`,
  `chore:`, `style:`, `docs:`, `ci:`, `a11y:`). Subject under 70 chars,
  imperative mood, no trailing period.
- Granular commits beat heroic ones. Investors read the log.

## What you must NOT do without explicit review

- Modify `src/lib/canonical.ts` without coordinating the matching
  Python change in `ProofOfAIWork/src/poaw/workbench/proof/canonical.py`
  and updating the pinned byte-vector tests on both sides.
- Modify `src/lib/verify.ts` without round-trip tests for: valid sig,
  tampered payload, sig-from-other-payload, missing key/sig/payload.
- Loosen the CSP in `public/_headers` for analytics, ads, or anything
  that lets third-party scripts execute on the proof pages.
- Change the auth handoff path while Plan §E.2 is still in flux —
  iframe-vs-PKCE is awaiting decision.
- Reword consent text in `src/pages/PrivacyPage.tsx` away from the
  verbatim plan §2.1/§2.2 quotes without legal review.
- Write to `localStorage` outside `src/lib/auth.ts`.

## Cross-repo contract check

Frontend hardcodes a few literal strings that must match
`poaw.workbench.constants` in the backend (e.g. `CONSENT_VERSION`,
section ids, error codes). Drift here is silent — last sweep found
four such bugs before a contract test existed.

Run before opening a PR that touches `src/types/api.ts`,
`src/lib/api.ts`, `src/pages/ExamStartPage.tsx`, or anything that
branches on `ApiError.code`:

```bash
BACKEND_REPO_PATH=/abs/path/to/ProofOfAIWork \
  node scripts/check-contract.mjs
```

Skips silently when `BACKEND_REPO_PATH` is unset, so contributors
without a backend checkout aren't punished.

## Code style

- TypeScript strict, no `any` without a comment explaining why.
- Functional React components. Derive over `useState` whenever possible.
- One `<h1>` per page; preserve heading hierarchy for AT.
- Form inputs always have associated `<label htmlFor>` (WCAG 1.3.1).
- Buttons that are not in a form get explicit `type="button"`.

## PR checklist

The PR template has a per-area checklist. Use it. CI gates the basics
(lint, typecheck, vitest, build), but the high-stakes paths
(signature, auth, privacy) get extra eyes regardless of what CI says.

## Reporting security issues

Don't open a public issue — see `SECURITY.md`.

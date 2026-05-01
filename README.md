# proofofaiwork-exam

Frontend for **PoAW Exam** — `assessment.proofofaiwork.com`.

Vite + React + TypeScript SPA. Talks to the existing PoAW FastAPI backend
over `/api/v1/workbench/*` (HTTP) and a per-session WebSocket for chat
transport. Public proof verification runs in the browser via
`@stablelib/ed25519` — no trust placed on the server's verify endpoint.

> **Companion repo.** Backend lives at `D:/lost_marbles/ProofOfAIWork/` in
> the `src/poaw/workbench/` subpackage. Master plan is
> `WORKBENCH_IMPLEMENTATION_PLAN_v2.md` in that repo.

## Status

Auth-independent surfaces (live):

- `/` — Landing page with backend health probe
- `/pricing` — Open vs Verified comparison (Plan §H.1)
- `/privacy` — Verbatim consent + data inventory + DSAR rights (Plan §2)
- `/p/:proofId` — Public proof page with offline Ed25519 verification
- `/verify` — Standalone verifier (paste proof JSON, override pubkey)

Auth-gated surfaces (scaffolded; pending auth-handoff decision):

- `/exam/start` — Pre-flight + consent + tier select
- `/exam/session/:id` — Live exam shell (chat + section navigator land Week 2)

**Open auth question.** Plan v2.1 specs an iframe `postMessage` handoff;
o3 review flagged a target-origin spoofing hole. Pivot to OAuth2 PKCE
top-level redirect is the recommended fix. Until decided, the candidate
flow is gated. See `WORKBENCH_IMPLEMENTATION_PLAN_v2.md` §E.2.

## Local setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local — point VITE_API_BASE_URL at the local backend.

npm run dev          # → http://localhost:5173
npm test             # vitest, 25 tests across canonical + verify
npm run build        # → dist/, ~217KB JS / 71KB gzipped
```

If you don't have the backend up: the dev-mode `AuthGate` accepts any
string as a token when `VITE_AUTH_ORIGIN` is empty, so you can exercise
routing and the API-error UI.

## Project layout

```
src/
├── App.tsx                  # router
├── main.tsx                 # entry
├── components/
│   └── AuthGate.tsx         # auth gate (iframe handoff, pending PKCE pivot)
├── pages/
│   ├── LandingPage.tsx      # public + health probe
│   ├── PricingPage.tsx      # public, Open vs Verified table
│   ├── PrivacyPage.tsx      # public, consent + data inventory
│   ├── PublicProofPage.tsx  # public, GET /proofs/{id} + offline verify
│   ├── VerifyPage.tsx       # public, paste-and-verify standalone
│   ├── ExamStartPage.tsx    # auth-gated; pre-flight + consent
│   ├── ExamSessionPage.tsx  # auth-gated; live exam shell
│   └── NotFoundPage.tsx
├── lib/
│   ├── api.ts               # typed fetch wrapper
│   ├── auth.ts              # bearer in localStorage + handoff helper
│   ├── canonical.ts         # JS port of canonical-JSON, byte-identical to Python
│   ├── canonical.test.ts    # pinned-vector regression vs Python (signature drift guard)
│   ├── verify.ts            # Ed25519 envelope verification
│   ├── verify.test.ts       # round-trip + tamper detection
│   ├── env.ts               # typed env access
│   └── ws.ts                # WS connector, auth in first message
├── types/
│   └── api.ts               # types mirroring backend Pydantic schemas
└── styles/
    └── globals.css          # design tokens + page styles (~620 lines)
```

## Cross-language signature integrity

`src/lib/canonical.ts` is a JS port of the Python `canonicalize` in
`ProofOfAIWork/src/poaw/workbench/proof/canonical.py`. Both have a
**pinned byte-vector test** asserting the same canonical output for a
fixed payload. CI on either repo catches drift; without that, signed
proofs would silently stop verifying in the browser after any
canonicalizer tweak.

## Cloudflare Pages

GitHub Action publishes:

- **PRs** → preview URLs.
- **`main`** → production at `assessment.proofofaiwork.com` (DNS pending).

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Required GitHub variables (inlined into the bundle, so public):

- `VITE_API_BASE_URL` — `https://proofofaiwork.com`
- `VITE_WS_BASE_URL` — `wss://proofofaiwork.com`
- `VITE_AUTH_ORIGIN` — `https://proofofaiwork.com`
- `VITE_PROOF_PUBLIC_KEY` — base64 Ed25519 verification key
- `VITE_FEATURE_VERIFIED_ENABLED` — `"false"` until Week 10
- `VITE_SENTRY_DSN` — optional

`public/_redirects` provides SPA fallback. `public/_headers` ships strict
CSP, HSTS, frame-ancestors none, and permissions-policy that allows only
`camera=(self)` (Verified webcam).

## API contract

Frontend talks ONLY to `/api/v1/workbench/*`. No model aliases are
hardcoded — `GET /api/v1/workbench/models` is the source of truth.

When backend Pydantic schemas change, `src/types/api.ts` is the matching
hand-edit. v2 plans an OpenAPI codegen swap; until then, keep them in
sync.

## Convention notes

- Bearer goes in `Authorization` header for HTTP, **first WS message** for
  WebSocket. Never in the URL.
- All backend errors come back as `{ error: { code, message, details } }`.
  The API client raises a typed `ApiError` so callers branch on `.code`.
- `localStorage` is touched only by `src/lib/auth.ts`.
- `tsc -b` runs with `noEmit: true` — vite handles bundling.

## Branch strategy

Per v2 decision #17: `main` is prod-tracking. Land work via
`feature/workbench-*` PRs.

## License

TBD — pending Adam's call. Workspace default is Apache 2.0, but this
is a paid-product surface; defer to project-specific decision.

# proofofaiwork-exam

Frontend for **PoAW Exam** — assessment.proofofaiwork.com.

This is the Vite + React + TypeScript app for the Workbench. It talks to the
existing PoAW FastAPI backend over `/api/v1/workbench/*` and over a WebSocket
for the chat transport.

> **Companion repo.** Backend lives in the existing PoAW repo on the
> `feature/workbench-*` branches. See `WORKBENCH_IMPLEMENTATION_PLAN_v2.md`
> for the master plan.

## Status: Week 1 scaffold

What works:

- Vite + React + TS bootstrap, strict tsconfig, ESLint, Prettier.
- Routing skeleton with Landing, ExamStart, ExamSession, NotFound pages.
- Typed API wrapper covering every backend route in the v2.1 contract.
- Bearer-in-localStorage auth with iframe-handoff postMessage handler
  (per v2 decision #1).
- WebSocket helper that authenticates via the **first client message**, never
  the URL.
- Cloudflare Pages preview deploy via GitHub Actions.
- `_headers` and `_redirects` for security headers and SPA fallback.

What is **not** in this scaffold (lands Week 2+):

- Section navigator, streaming chat, model picker.
- Submit-section flow with the server-side deadline guard.
- Verified-tier flows (Plaid IDV, Square checkout, webcam consent).
- Real design system; current styling is intentionally minimal.
- E2E tests (Playwright lands Week 3).

## Local setup

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
# Edit .env.local — point VITE_API_BASE_URL at the local backend
# (default http://localhost:8000 works if you have the backend running there).

# 3. Run
npm run dev
# → http://localhost:5173
```

If you don't have the backend up yet: the dev-mode `AuthGate` falls back to a
"paste any string as a dev token" form when `VITE_AUTH_ORIGIN` is empty, so
you can still exercise the routing and the API-error UI.

## Project layout

```
src/
├── App.tsx                  # router
├── main.tsx                 # entry
├── vite-env.d.ts            # typed env vars
├── components/
│   └── AuthGate.tsx         # iframe-handoff auth gate
├── pages/
│   ├── LandingPage.tsx      # public, with health probe
│   ├── ExamStartPage.tsx    # auth-gated; loads model list from server
│   ├── ExamSessionPage.tsx  # auth-gated; opens WS skeleton
│   └── NotFoundPage.tsx
├── lib/
│   ├── api.ts               # typed fetch wrapper, every route in v2.1 contract
│   ├── auth.ts              # bearer in localStorage + iframe handoff
│   ├── env.ts               # typed env access
│   └── ws.ts                # WS connector, auth in first message
├── types/
│   └── api.ts               # types mirroring backend Pydantic schemas
└── styles/
    └── globals.css          # minimal, system fonts, dark-mode-aware
```

## Cloudflare Pages

The `cloudflare-pages.yml` GitHub Action publishes:

- **PRs** → preview URLs.
- **`main`** → production at `assessment.proofofaiwork.com`.

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Required GitHub repository variables (these get inlined into the bundle, so
they're public):

- `VITE_API_BASE_URL` — usually `https://proofofaiwork.com`
- `VITE_WS_BASE_URL` — usually `wss://proofofaiwork.com`
- `VITE_AUTH_ORIGIN` — usually `https://proofofaiwork.com`
- `VITE_FEATURE_VERIFIED_ENABLED` — `"false"` until Week 10
- `VITE_SENTRY_DSN` — optional

## API contract

The frontend talks ONLY to `/api/v1/workbench/*`. No model aliases are
hardcoded — `GET /api/v1/workbench/models` is the source of truth.

When backend Pydantic schemas change, `src/types/api.ts` is the matching
hand-edit. v2 swaps this to OpenAPI codegen — until then, keep them in sync.

## Convention notes

- Bearer goes in `Authorization` header for HTTP, in the **first message**
  for WebSocket. Never in the URL.
- All errors from the backend come back as `{ error: { code, message,
  details } }`. The API client raises a typed `ApiError` so callers can
  branch on `.code`.
- `localStorage` is touched only by `src/lib/auth.ts`. Don't sprinkle
  `localStorage.getItem` calls anywhere else.
- No `useState` for anything that should be derived. Prefer derived values
  computed during render.

## Branch strategy

Per v2 decision #17: `main` is the prod-tracking branch. Land work via
`feature/workbench-*` PRs.

## License

Proprietary. All rights reserved, Adam Thomas LLC.

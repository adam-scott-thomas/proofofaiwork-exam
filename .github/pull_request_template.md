<!--
PR template for proofofaiwork-exam.
Tailored to the product's high-stakes paths — fill in only the boxes
that apply to your PR.
-->

## Summary

<!-- One or two sentences. What does this PR change and why? -->

## High-stakes path checklist

The PoAW Exam product depends on a small number of paths that, if
broken, silently invalidate every signed proof. Tick whichever apply
and include the receipts.

- [ ] **Canonical JSON change** (`src/lib/canonical.ts`) — coordinated
      with the Python signer at
      `ProofOfAIWork/src/poaw/workbench/proof/canonical.py`? Pinned
      byte-vector test on both sides updated together?
- [ ] **Verifier change** (`src/lib/verify.ts`) — round-trip test still
      passes for: untampered, payload-tampered, sig-from-other-payload,
      missing key/sig/payload?
- [ ] **Auth handoff change** (`src/lib/auth.ts`,
      `src/components/AuthGate.tsx`) — postMessage targetOrigin
      reviewed? Token never crossed an origin it shouldn't?
- [ ] **Privacy/consent text** (`PrivacyPage.tsx`, `ExamStartPage.tsx`)
      — kept verbatim with `WORKBENCH_SECURITY_PRIVACY_PLAN_v2.md`
      §2.1/§2.2? Any new commitment that needs a backend endpoint to
      back it up?
- [ ] **CSP / headers** (`public/_headers`) — new external origin added
      to `connect-src`? Sentry / analytics scripts?
- [ ] **Public proof page** (`PublicProofPage.tsx`) — change still
      respects 410 generic-message rule (never reveals revocation
      reason)?

If none apply, write `n/a`.

## Test plan

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Manual smoke (specify which page / flow you exercised)

## Plan reference

Which section of `WORKBENCH_IMPLEMENTATION_PLAN_v2.md` does this
implement, or is this a deviation? Cite the section, e.g. `§E.2`.

## Screenshots / recordings

If UI: drop a screenshot or short capture here.

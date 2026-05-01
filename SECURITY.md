# Security policy

## Reporting a vulnerability

Email **security@proofofaiwork.com** with:

- A description of the issue and its impact.
- Steps to reproduce (or a proof-of-concept), if you have one.
- The version / commit you tested against.

Please do **not** open a public GitHub issue or post details to social
media before we've had a chance to respond.

We aim to:

- **Acknowledge** the report within 3 business days.
- **Triage and confirm** within 7 business days.
- **Patch and disclose** within 60 days for severity-Critical and
  -High issues; longer for lower-severity issues, coordinated with the
  reporter.

If you don't hear back in the windows above, please send a follow-up.

## Scope

This policy covers the PoAW Exam frontend (this repo) and its
interaction with the PoAW backend. Findings in scope include but are
not limited to:

- Tampered or forged proofs that the offline verifier accepts as valid.
- Auth-handoff bypass or token theft via the workbench frontend.
- XSS or content-injection vectors via candidate-rendered transcripts.
- CSP bypass enabling exfiltration of localStorage / session tokens.
- Cross-language canonical-JSON drift (Python signer vs JS verifier)
  that allows a payload to verify in one and not the other.
- Privacy bypasses against `/p/:id` revocation (e.g. accessing a
  withdrawn proof's content).

Out of scope (please don't report these as vulnerabilities):

- Best-practice missing headers on **non-production** subdomains.
- Self-XSS that requires the user to paste attacker-controlled JS into
  their own browser dev tools.
- Reports from automated scanners without a working PoC.
- Findings against third-party services (Plaid, Square, Anthropic);
  please report to those vendors directly.

## Safe harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to follow this policy.
- Avoid privacy violations, destruction of data, and interruption or
  degradation of our services.
- Only interact with their own accounts (or accounts they have explicit
  permission to test).
- Give us reasonable time to investigate and patch before any public
  disclosure.

## Hall of fame

We're a small team and don't currently have a paid bounty program, but
we will publicly credit reporters in release notes if they want.

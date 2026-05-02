#!/usr/bin/env node
/**
 * Contract drift guard.
 *
 * Compares the frontend's hardcoded string literals against the backend's
 * authoritative constants in
 * `<BACKEND_REPO_PATH>/src/poaw/workbench/constants.py`.
 *
 * This session found four contract drift bugs:
 *   1. CONSENT_VERSION = "v2.1" (FE) vs "wb-consent-2.0" (BE) →
 *      every consent_meta row tagged with a string the BE didn't recognize.
 *   2. SessionState union missing "ready" → fresh sessions unmatched.
 *   3. WorkbenchHealthOut shape declared fields the BE never returned.
 *   4. WS keepalive: BE sends ping, FE didn't reply with pong.
 *
 * (1) and (2) would be caught by this script. The hope is that a
 * pre-commit / CI pass running this script catches the next class.
 *
 * Usage:
 *   BACKEND_REPO_PATH=/abs/path/to/ProofOfAIWork node scripts/check-contract.mjs
 *
 * Skipped when BACKEND_REPO_PATH is unset (so contributors without a
 * backend checkout aren't punished).
 *
 * To extend coverage, add to the EXPECTED dict below. Each entry maps a
 * Python constant name to the literal value the frontend depends on.
 */

import fs from "node:fs";
import path from "node:path";


const EXPECTED = {
  // Versioning
  EXAM_VERSION: "v2.1",
  GRADER_VERSION: "grader-v2.1.0",
  CONSENT_VERSION: "wb-consent-2.0",

  // Tiers
  TIER_OPEN: "open",
  TIER_VERIFIED: "verified",

  // Sections
  SECTION_DIAGNOSE: "diagnose",
  SECTION_PERFORM: "perform",
  SECTION_REPAIR: "repair",

  // Variant families
  FAMILY_DIAGNOSE_TRANSCRIPT: "diagnose_transcript",
  FAMILY_DATA_EXTRACTION: "data_extraction",
  FAMILY_SPEC_TRANSLATION: "spec_translation",
  FAMILY_DEBUG_REPAIR: "debug_repair",
  FAMILY_REPAIR_ARTIFACT: "repair_artifact",

  // 6 grading dimensions
  DIM_TASK_DECOMPOSITION: "task_decomposition",
  DIM_CONTEXT_PROVISIONING: "context_provisioning",
  DIM_PROMPT_PRECISION: "prompt_precision",
  DIM_VERIFICATION_SKEPTICISM: "verification_skepticism",
  DIM_ITERATION_STRATEGY: "iteration_strategy",
  DIM_OUTPUT_INTEGRATION: "output_integration",

  // Identity verification states
  IDV_PASSED: "passed",
  IDV_FAILED: "failed",

  // Error codes the FE branches on (via ApiError.code === ...)
  ERR_VERIFIED_DISABLED: "verified_disabled",
  ERR_PAYMENT_REQUIRED: "payment_required",
  ERR_IDENTITY_REQUIRED: "identity_required",
  ERR_COOLDOWN_ACTIVE: "cooldown_active",
  ERR_SECTION_TIME_EXCEEDED: "section_time_exceeded",

  // OAuth 2.1 + PKCE — frontend hardcodes client_id, scope, the
  // grant_type literal "authorization_code", and reads the response
  // shape via TokenResponse. Drift here means /token starts rejecting
  // the SPA's requests with invalid_client or invalid_request.
  OAUTH_CLIENT_ID: "poaw-workbench-spa",
  OAUTH_SCOPE: "workbench",
  OAUTH_CODE_TTL_S: 60,
  OAUTH_TOKEN_TTL_S: 3600,
};


const backendPath = process.env.BACKEND_REPO_PATH;
if (!backendPath || backendPath.trim().length === 0) {
  console.warn(
    "[check-contract] BACKEND_REPO_PATH not set — skipping contract drift check."
  );
  console.warn(
    "                 Set it to your local checkout of the ProofOfAIWork repo to enable."
  );
  process.exit(0);
}

const constantsPath = path.join(
  backendPath,
  "src",
  "poaw",
  "workbench",
  "constants.py",
);

if (!fs.existsSync(constantsPath)) {
  console.error(
    `[check-contract] backend constants.py not found at ${constantsPath}`
  );
  console.error(
    "                 Is BACKEND_REPO_PATH pointing at the right repo root?"
  );
  process.exit(1);
}

const source = fs.readFileSync(constantsPath, "utf8");

// Parse `NAME: Final[type] = <literal>` for two literal forms:
//  - quoted strings:  NAME: Final[str] = "value"
//  - unquoted ints:   NAME: Final[int] = 60
// First match wins; subsequent occurrences of the same name are ignored.
const reStr = /^([A-Z_][A-Z0-9_]*)\s*:\s*Final\b[^=]*=\s*"([^"]+)"/gm;
const reInt = /^([A-Z_][A-Z0-9_]*)\s*:\s*Final\b[^=]*=\s*(-?\d+)\s*(?:#.*)?$/gm;

const found = {};
for (const re of [reStr, reInt]) {
  let m;
  while ((m = re.exec(source)) !== null) {
    if (!(m[1] in found)) {
      const raw = m[2];
      // Coerce digit-only strings to numbers so the EXPECTED dict can
      // declare integer literals naturally.
      found[m[1]] = /^-?\d+$/.test(raw) ? Number(raw) : raw;
    }
  }
}


const drift = [];
for (const [name, expected] of Object.entries(EXPECTED)) {
  const actual = found[name];
  if (actual === undefined) {
    drift.push({ name, kind: "missing", expected, actual: "<not in constants.py>" });
    continue;
  }
  if (actual !== expected) {
    drift.push({ name, kind: "mismatch", expected, actual });
  }
}


if (drift.length === 0) {
  console.log(
    `[check-contract] OK — ${Object.keys(EXPECTED).length} constants match backend.`
  );
  process.exit(0);
}

console.error("\n[check-contract] CONTRACT DRIFT DETECTED:\n");
for (const { name, kind, expected, actual } of drift) {
  if (kind === "missing") {
    console.error(`  - ${name}: missing in backend constants.py (frontend expects "${expected}")`);
  } else {
    console.error(`  - ${name}: backend="${actual}" frontend expects "${expected}"`);
  }
}
console.error(
  "\n  Pick one:\n" +
    "    a) Update the frontend literal that depends on this constant\n" +
    "    b) Update EXPECTED in scripts/check-contract.mjs\n" +
    "    c) Coordinate the backend change with whoever depends on it\n",
);
process.exit(1);

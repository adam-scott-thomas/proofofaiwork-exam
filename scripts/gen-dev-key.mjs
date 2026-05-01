#!/usr/bin/env node
/**
 * Generate a fresh Ed25519 keypair for local development.
 *
 * Usage:
 *   node scripts/gen-dev-key.mjs
 *
 * Outputs both halves as unpadded base64. Paste the PUBLIC half into
 * VITE_PROOF_PUBLIC_KEY in .env.local, and the PRIVATE half into the
 * backend's WB_PROOF_SIGNING_KEY env var. The two will then match,
 * and /verify and /p/:id will succeed against locally-signed proofs.
 *
 * SECURITY: this is a DEVELOPMENT helper. Production keys must be
 * generated with the documented production key-rotation runbook (HSM /
 * sealed env, never console output, audit-logged) — NOT this script.
 *
 * The private key printed here lives in your shell history for as long
 * as your terminal keeps it. Don't paste it into PR descriptions, chat,
 * or anywhere else.
 */

import { generateKeyPair } from "@stablelib/ed25519";


function b64encode(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return Buffer.from(bin, "binary").toString("base64").replace(/=+$/, "");
}


const { publicKey, secretKey } = generateKeyPair();

console.log("\n# Ed25519 dev keypair (base64, unpadded)\n");
console.log(`# Frontend (.env.local) — verifier:`);
console.log(`VITE_PROOF_PUBLIC_KEY=${b64encode(publicKey)}\n`);
console.log(`# Backend (.env, never commit) — signer:`);
console.log(`WB_PROOF_SIGNING_KEY=${b64encode(secretKey)}\n`);
console.log("# Reminder: DEV keys only. Don't paste the secret into PRs, chat, or logs.\n");

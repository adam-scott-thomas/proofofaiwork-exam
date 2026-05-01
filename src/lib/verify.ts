/**
 * Offline Ed25519 verification of workbench proofs.
 *
 * Uses @stablelib/ed25519 (audit-friendly pure-JS impl, RFC 8032 compliant).
 * Same canonical-JSON rules as the server-side signer (lib/canonical.ts).
 *
 * Public key sources (in order of preference):
 *   1. VITE_PROOF_PUBLIC_KEY — baked at build time, the durable trust anchor
 *   2. Override passed to verifyProof() — for cross-checking against a
 *      key fetched from /api/v1/workbench/keys/{key_id} when verifying
 *      proofs signed by a rotated-out key
 */

import { verify as ed25519Verify } from "@stablelib/ed25519";

import { canonicalize } from "@/lib/canonical";
import { env } from "@/lib/env";

export type VerifyOutcome =
  | { valid: true; canonicalHash: string }
  | { valid: false; reason: VerifyFailureReason; canonicalHash?: string };

export type VerifyFailureReason =
  | "missing_public_key"
  | "missing_signature"
  | "missing_payload"
  | "canonical_hash_mismatch"
  | "signature_invalid"
  | "decode_error";


/**
 * Verify a full proof envelope. The shape is what GET /proofs/{id}
 * returns:
 *
 *   {
 *     proof_id, public_payload, canonical_hash, signature_b64,
 *     signing_key_id, issued_at
 *   }
 *
 * Returns a discriminated union with `valid`. On valid=false, `reason`
 * gives the precise failure mode for diagnostic UI.
 */
// Mirrors `poaw.workbench.schemas.proof.PublicProofOut`. Optional fields
// are kept optional here because the /verify standalone page accepts
// hand-pasted JSON which may be missing them; the offline server-stored
// shape always populates them.
export interface ProofEnvelope {
  proof_id?: string;
  public_payload: Record<string, unknown>;
  canonical_hash: string;
  signature_b64: string;
  signing_key_id?: string;
  issued_at?: string;
}


export async function verifyProof(
  envelope: ProofEnvelope,
  options: { publicKeyB64?: string } = {},
): Promise<VerifyOutcome> {
  const publicKeyB64 = options.publicKeyB64 ?? env.proofPublicKey;
  if (!publicKeyB64) {
    return { valid: false, reason: "missing_public_key" };
  }
  if (!envelope.signature_b64) {
    return { valid: false, reason: "missing_signature" };
  }
  if (!envelope.public_payload) {
    return { valid: false, reason: "missing_payload" };
  }

  // 1. Re-canonicalize and compute SHA-256.
  let canonicalBytes: Uint8Array;
  try {
    canonicalBytes = canonicalize(envelope.public_payload);
  } catch (err) {
    return { valid: false, reason: "decode_error" };
  }
  const computedHash = await sha256Hex(canonicalBytes);

  // 2. Re-canonicalized hash must match what the server stored.
  if (computedHash !== envelope.canonical_hash) {
    return {
      valid: false,
      reason: "canonical_hash_mismatch",
      canonicalHash: computedHash,
    };
  }

  // 3. Verify the Ed25519 signature.
  let publicKey: Uint8Array;
  let signature: Uint8Array;
  try {
    publicKey = b64decode(publicKeyB64);
    signature = b64decode(envelope.signature_b64);
  } catch {
    return { valid: false, reason: "decode_error", canonicalHash: computedHash };
  }
  const ok = ed25519Verify(publicKey, canonicalBytes, signature);
  if (!ok) {
    return { valid: false, reason: "signature_invalid", canonicalHash: computedHash };
  }
  return { valid: true, canonicalHash: computedHash };
}


// --------------------------- helpers ---------------------------------------


async function sha256Hex(data: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
  );
  const bytes = new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}


function b64decode(s: string): Uint8Array {
  // Accept padded or unpadded base64 — the server emits without padding.
  let padded = s.trim();
  while (padded.length % 4 !== 0) padded += "=";
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}


// --------------------------- friendly reason text -------------------------


export function reasonLabel(reason: VerifyFailureReason): string {
  switch (reason) {
    case "missing_public_key":
      return "No public key configured. Build needs VITE_PROOF_PUBLIC_KEY.";
    case "missing_signature":
      return "Proof has no signature.";
    case "missing_payload":
      return "Proof has no payload.";
    case "canonical_hash_mismatch":
      return "Payload was tampered with — recomputed hash doesn't match the stored hash.";
    case "signature_invalid":
      return "Signature does not verify against the public key.";
    case "decode_error":
      return "Could not decode the proof's base64 fields.";
  }
}

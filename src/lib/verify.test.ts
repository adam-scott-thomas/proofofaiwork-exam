/**
 * verifyProof tests. Round-trip + tamper detection. Uses a freshly
 * generated keypair (stablelib ed25519) so the test doesn't need any
 * environment configured — we override the public key explicitly.
 */
import { generateKeyPair, sign as ed25519Sign } from "@stablelib/ed25519";
import { describe, expect, it } from "vitest";

import { canonicalize } from "./canonical";
import { verifyProof, type ProofEnvelope } from "./verify";


function b64encode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, "");
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
  );
  let out = "";
  for (const b of new Uint8Array(buf)) out += b.toString(16).padStart(2, "0");
  return out;
}


async function makeSigned(
  payload: Record<string, unknown>,
): Promise<{ envelope: ProofEnvelope; pubB64: string }> {
  const { publicKey, secretKey } = generateKeyPair();
  const canonicalBytes = canonicalize(payload);
  const sig = ed25519Sign(secretKey, canonicalBytes);
  const envelope: ProofEnvelope = {
    proof_id: "test-id",
    public_payload: payload,
    canonical_hash: await sha256Hex(canonicalBytes),
    signature_b64: b64encode(sig),
    signing_key_id: "test-key",
  };
  return { envelope, pubB64: b64encode(publicKey) };
}


const PAYLOAD = {
  v: 1,
  proof_id: "test-id",
  scores: { composite: 79, level: "Advanced" },
};


describe("verifyProof", () => {
  it("returns valid: true for an untampered proof", async () => {
    const { envelope, pubB64 } = await makeSigned(PAYLOAD);
    const r = await verifyProof(envelope, { publicKeyB64: pubB64 });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.canonicalHash).toBe(envelope.canonical_hash);
  });

  it("returns canonical_hash_mismatch when payload is tampered", async () => {
    const { envelope, pubB64 } = await makeSigned(PAYLOAD);
    // Tamper the payload AFTER signing — recomputed hash will diverge.
    envelope.public_payload = { ...PAYLOAD, scores: { composite: 99 } };
    const r = await verifyProof(envelope, { publicKeyB64: pubB64 });
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.reason).toBe("canonical_hash_mismatch");
      // Hash of the TAMPERED payload is returned for client diff.
      expect(r.canonicalHash).not.toBe(envelope.canonical_hash);
    }
  });

  it("returns signature_invalid when sig comes from a different payload", async () => {
    const { envelope, pubB64 } = await makeSigned(PAYLOAD);
    const other = await makeSigned({ ...PAYLOAD, scores: { composite: 50 } });
    // Swap the signature: payload + hash say PAYLOAD, but sig is for `other`.
    envelope.signature_b64 = other.envelope.signature_b64;
    const r = await verifyProof(envelope, { publicKeyB64: pubB64 });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe("signature_invalid");
  });

  it("returns missing_public_key when no key is configured", async () => {
    const { envelope } = await makeSigned(PAYLOAD);
    const r = await verifyProof(envelope, { publicKeyB64: "" });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe("missing_public_key");
  });

  it("returns missing_signature when sig is empty", async () => {
    const { envelope, pubB64 } = await makeSigned(PAYLOAD);
    envelope.signature_b64 = "";
    const r = await verifyProof(envelope, { publicKeyB64: pubB64 });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe("missing_signature");
  });

  it("returns missing_payload when payload is null", async () => {
    const { envelope, pubB64 } = await makeSigned(PAYLOAD);
    // @ts-expect-error — testing the runtime guard
    envelope.public_payload = null;
    const r = await verifyProof(envelope, { publicKeyB64: pubB64 });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe("missing_payload");
  });

  it("accepts both padded and unpadded base64", async () => {
    const { envelope, pubB64 } = await makeSigned(PAYLOAD);
    // Add explicit padding to public key + signature
    const padded = pubB64 + "=".repeat((4 - (pubB64.length % 4)) % 4);
    const r = await verifyProof(envelope, { publicKeyB64: padded });
    expect(r.valid).toBe(true);
  });

  it("verifies the same payload regardless of dict literal order", async () => {
    // Sign payload with one key order; verify with another.
    const { envelope, pubB64 } = await makeSigned(PAYLOAD);
    envelope.public_payload = {
      scores: { level: "Advanced", composite: 79 },   // reversed inner
      proof_id: "test-id",
      v: 1,
    };
    const r = await verifyProof(envelope, { publicKeyB64: pubB64 });
    // Canonicalization sorts keys, so byte output is identical → still valid
    expect(r.valid).toBe(true);
  });
});

/**
 * Offline proof verifier — assessment.proofofaiwork.com/verify
 *
 * Accepts a full proof JSON (paste OR drag-drop) and verifies its signature
 * entirely in-browser using the baked-in VITE_PROOF_PUBLIC_KEY. No network
 * calls — useful for verifying a downloaded proof when offline, or for
 * auditors who don't trust the server's /verify endpoint.
 */
import { useCallback, useState } from "react";

import { Footer } from "@/components/Footer";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import {
  reasonLabel,
  verifyProof,
  type ProofEnvelope,
  type VerifyOutcome,
} from "@/lib/verify";


export function VerifyPage() {
  useDocumentTitle("Verify a proof");
  const [text, setText] = useState("");
  const [outcome, setOutcome] = useState<VerifyOutcome | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [keyOverride, setKeyOverride] = useState("");

  const onVerify = useCallback(async () => {
    setOutcome(null);
    setParseError(null);
    let envelope: ProofEnvelope;
    try {
      envelope = JSON.parse(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setParseError(`Couldn't parse JSON: ${msg}`);
      return;
    }
    const result = await verifyProof(envelope, {
      publicKeyB64: keyOverride.trim() || undefined,
    });
    setOutcome(result);
  }, [text, keyOverride]);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const txt = await file.text();
    setText(txt);
  }, []);

  return (
    <>
    <main className="verify-page">
      <h1>Verify a PoAW Exam proof</h1>
      <p className="muted">
        Paste a proof JSON below or drop a `.json` file on the box. The
        signature is checked entirely in your browser against the public
        key baked into this page. No network calls.
      </p>

      <label htmlFor="proof-json">Proof JSON</label>
      <textarea
        id="proof-json"
        className="proof-input"
        placeholder='{"proof_id":"...","public_payload":{...},"signature_b64":"..."}'
        value={text}
        onChange={(e) => setText(e.target.value)}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        spellCheck={false}
        rows={14}
        aria-describedby="proof-json-hint"
      />
      <p id="proof-json-hint" className="muted small">
        Paste the JSON or drop a <code>.json</code> file on the box.
      </p>

      <details className="key-override">
        <summary>Use a different public key</summary>
        <p className="small">
          For verifying historical proofs signed by a rotated-out key.
          Paste the base64 public key here — leave empty to use the
          built-in <code>VITE_PROOF_PUBLIC_KEY</code>.
        </p>
        <label htmlFor="key-override">Public key (base64)</label>
        <input
          id="key-override"
          type="text"
          placeholder="base64 public key (no padding)"
          value={keyOverride}
          onChange={(e) => setKeyOverride(e.target.value)}
        />
      </details>

      <button type="button" onClick={onVerify} disabled={!text.trim()}>
        Verify
      </button>

      {parseError && (
        <p className="badge badge-bad" role="alert">{parseError}</p>
      )}
      {outcome && (
        <ResultBlock outcome={outcome} />
      )}
    </main>
    <Footer />
    </>
  );
}


function ResultBlock({ outcome }: { outcome: VerifyOutcome }) {
  if (outcome.valid) {
    return (
      <div className="result result-ok" role="status">
        <h2>✓ Signature verified</h2>
        <p>The proof's payload matches its signature; this is a genuine proof
        issued by PoAW.</p>
        {outcome.canonicalHash && (
          <p>Canonical hash: <code className="hash">{outcome.canonicalHash}</code></p>
        )}
      </div>
    );
  }
  return (
    <div className="result result-bad" role="alert">
      <h2>✗ Verification failed</h2>
      <p>{reasonLabel(outcome.reason)}</p>
      {outcome.canonicalHash && (
        <p>Server-recomputed hash: <code className="hash">{outcome.canonicalHash}</code></p>
      )}
    </div>
  );
}

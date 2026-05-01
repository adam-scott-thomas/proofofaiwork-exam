/**
 * Public proof verification page — assessment.proofofaiwork.com/p/{proof_id}.
 *
 * Fetches GET /api/v1/workbench/proofs/{proof_id} and verifies offline.
 * Per WORKBENCH_IMPLEMENTATION_PLAN_v2 §G:
 *   - 200 → render the public payload + show "Signature verified" badge
 *   - 410 → generic "no longer available" (NEVER reveals revocation reason)
 *   - 404 → not found
 *
 * The verification runs in the browser via lib/verify.ts; no trust placed
 * on the server's /verify endpoint (clients can audit independently).
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { Footer } from "@/components/Footer";
import { ApiError, getProof } from "@/lib/api";
import { formatIssuedAt } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import {
  reasonLabel,
  verifyProof,
  type ProofEnvelope,
  type VerifyOutcome,
} from "@/lib/verify";


type FetchState =
  | { kind: "loading" }
  | { kind: "ok"; envelope: ProofEnvelope }
  | { kind: "unavailable"; proofId: string }       // 410 — generic
  | { kind: "not_found" }
  | { kind: "error"; message: string };


export function PublicProofPage() {
  const { proofId } = useParams<{ proofId: string }>();
  const [fetchState, setFetchState] = useState<FetchState>({ kind: "loading" });
  const [verify, setVerify] = useState<VerifyOutcome | null>(null);

  useDocumentTitle(deriveProofTitle(fetchState));

  useEffect(() => {
    if (!proofId) return;
    const ctrl = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const envelope = await getProof(proofId, ctrl.signal);
        if (cancelled) return;
        setFetchState({ kind: "ok", envelope });

        const outcome = await verifyProof(envelope);
        if (!cancelled) setVerify(outcome);
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 410) {
            setFetchState({ kind: "unavailable", proofId });
            return;
          }
          if (err.status === 404) {
            setFetchState({ kind: "not_found" });
            return;
          }
          setFetchState({ kind: "error", message: err.message });
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        setFetchState({ kind: "error", message });
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [proofId]);

  if (fetchState.kind === "loading") {
    return <Page><p>Loading proof…</p></Page>;
  }

  if (fetchState.kind === "unavailable") {
    return (
      <Page>
        <h1>This proof is no longer available</h1>
        <p>
          The credential holder withdrew this proof, or it has otherwise
          been removed. Contact the credential holder for current status.
        </p>
        <p className="muted">Proof ID: {fetchState.proofId}</p>
      </Page>
    );
  }

  if (fetchState.kind === "not_found") {
    return (
      <Page>
        <h1>Proof not found</h1>
        <p>No proof exists at this URL.</p>
      </Page>
    );
  }

  if (fetchState.kind === "error") {
    return (
      <Page>
        <h1>Couldn't load proof</h1>
        <p className="muted">{fetchState.message}</p>
      </Page>
    );
  }

  const { envelope } = fetchState;
  const payload = envelope.public_payload as unknown as PublicPayload;
  return (
    <Page>
      <h1>{payload.user.display_name ?? payload.user.handle}</h1>
      <p className="muted">
        {payload.exam.name} · {payload.exam.version} ·{" "}
        <strong>{payload.exam.tier}</strong>
      </p>

      <section>
        <h2>{payload.scores.level} — {payload.scores.composite}/100</h2>
        {payload.scores.percentile != null && (
          <p>Percentile: {payload.scores.percentile}</p>
        )}
        <Dimensions dims={payload.scores.dimensions} />
      </section>

      <section>
        <h3>Verification</h3>
        <SignatureBadge outcome={verify} />
        <details>
          <summary>Technical details</summary>
          <ul>
            <li>Signing key id: <code>{envelope.signing_key_id ?? "?"}</code></li>
            <li>Canonical hash: <code className="hash">
              {verify?.canonicalHash ?? envelope.canonical_hash}
            </code></li>
            <li>
              Issued:{" "}
              <time
                dateTime={formatIssuedAt(payload.issued_at).machine}
                title={formatIssuedAt(payload.issued_at).machine}
              >
                {formatIssuedAt(payload.issued_at).display}
              </time>
            </li>
          </ul>
        </details>
      </section>

      <section>
        <h3>Task families completed</h3>
        <ul>
          {payload.exam.task_families_completed.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Models used</h3>
        <ul>
          {payload.exam.model_version_alias.map((m) => (
            <li key={m}><code>{m}</code></li>
          ))}
        </ul>
      </section>

      <p className="muted small">
        Verified independently in your browser using libsodium-compatible
        Ed25519. No data left this page after the proof was fetched.
      </p>
    </Page>
  );
}


// --------------------------- partials --------------------------------------


function SignatureBadge({ outcome }: { outcome: VerifyOutcome | null }) {
  if (outcome === null) return <p className="muted">Verifying…</p>;
  if (outcome.valid) {
    return (
      <p className="badge badge-ok" role="status">
        ✓ Signature verified
      </p>
    );
  }
  return (
    <p className="badge badge-bad" role="alert">
      ✗ Verification failed: {reasonLabel(outcome.reason)}
    </p>
  );
}


function Dimensions({ dims }: { dims: Record<string, number> }) {
  const entries = Object.entries(dims).sort();
  return (
    <table className="dim-table">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k}>
            <th scope="row">{k.replace(/_/g, " ")}</th>
            <td><strong>{v}</strong>/100</td>
            <td>
              <div className="bar" aria-hidden>
                <div className="bar-fill" style={{ width: `${v}%` }} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


function Page({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="public-proof">{children}</main>
      <Footer />
    </>
  );
}


function deriveProofTitle(state: FetchState): string {
  if (state.kind !== "ok") return "Proof";
  const payload = state.envelope.public_payload as unknown as PublicPayload;
  const who = payload.user?.display_name ?? payload.user?.handle ?? "Proof";
  const score = payload.scores?.composite;
  return score != null ? `${who} — ${score}/100` : who;
}


// --------------------------- payload type ---------------------------------


interface PublicPayload {
  v: number;
  proof_id: string;
  session_id: string;
  user: { handle: string; display_name?: string };
  exam: {
    name: string;
    version: string;
    tier: string;
    grading_version: string;
    model_family: string[];
    model_version_alias: string[];
    task_families_completed: string[];
  };
  scores: {
    composite: number;
    level: string;
    dimensions: Record<string, number>;
    percentile?: number;
  };
  issued_at: string;
  key_id: string;
  verification_url: string;
}

/**
 * ExamStartPage — pre-flight before an exam session is created.
 *
 * Responsibilities:
 *   - Require auth.
 *   - Fetch the tier-appropriate model list FROM THE SERVER (per v2 decision
 *     #10, frontend never hardcodes model aliases).
 *   - Show consent + the Open vs Verified copy.
 *   - On confirm → POST /sessions and route to /exam/session/:id.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthGate } from "@/components/AuthGate";
import { listModels, createSession, ApiError } from "@/lib/api";
import type { ListModelsOut, SessionTier } from "@/types/api";
import { env } from "@/lib/env";

// Must match poaw.workbench.constants.CONSENT_VERSION in the backend.
// Drift here means consent_meta rows get tagged with a version string
// the backend doesn't recognize — silent audit-trail breakage.
const CONSENT_VERSION = "wb-consent-2.0";

function ExamStartInner() {
  const navigate = useNavigate();
  const [tier, setTier] = useState<SessionTier>("open");
  const [models, setModels] = useState<
    | { kind: "loading" }
    | { kind: "ok"; data: ListModelsOut }
    | { kind: "stub"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "loading" });
  const [consentChecked, setConsentChecked] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    listModels(ctrl.signal)
      .then((data) => setModels({ kind: "ok", data }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 501) {
          setModels({
            kind: "stub",
            message:
              "Models endpoint not yet implemented (Week 2). " +
              "Frontend will show real models once it lands.",
          });
        } else {
          setModels({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => ctrl.abort();
  }, []);

  async function handleStart() {
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createSession({
        tier,
        consent_meta: {
          accepted_at: new Date().toISOString(),
          version: CONSENT_VERSION,
        },
      });
      navigate(`/exam/session/${result.session_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  }

  const verifiedAvailable = env.features.verifiedEnabled;

  return (
    <main className="stack-6">
      <h1>Start an exam</h1>

      <section>
        <h2>Tier</h2>
        <div className="row">
          <label>
            <input
              type="radio"
              name="tier"
              value="open"
              checked={tier === "open"}
              onChange={() => setTier("open")}
            />{" "}
            Open (free, honor-system)
          </label>
          <label>
            <input
              type="radio"
              name="tier"
              value="verified"
              checked={tier === "verified"}
              disabled={!verifiedAvailable}
              onChange={() => setTier("verified")}
            />{" "}
            Verified (Plaid IDV + payment, $49)
            {!verifiedAvailable && (
              <span className="muted"> — coming Week 10</span>
            )}
          </label>
        </div>
      </section>

      <section>
        <h2>Models you'll be paired with</h2>
        {models.kind === "loading" && (
          <p className="muted">Loading model list…</p>
        )}
        {models.kind === "ok" && (
          <ul>
            {models.data.models
              .filter((m) => m.available_for_tier.includes(tier))
              .map((m) => (
                <li key={m.alias}>
                  <strong>{m.display_name}</strong>{" "}
                  <span className="muted">({m.alias})</span>
                </li>
              ))}
          </ul>
        )}
        {models.kind === "stub" && (
          <p className="muted">{models.message}</p>
        )}
        {models.kind === "error" && (
          <p className="error">Could not load models: {models.message}</p>
        )}
        <p className="muted">
          The server picks which models are eligible for each tier. The
          frontend never hardcodes model names.
        </p>
      </section>

      <section>
        <h2>Consent</h2>
        <p className="muted">
          By starting, you confirm you've read the consent terms (version{" "}
          {CONSENT_VERSION}) and that you'll take the exam without unauthorized
          assistance.
        </p>
        <label>
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
          />{" "}
          I agree to the consent terms.
        </label>
      </section>

      {createError && (
        <p className="error" role="alert">
          {createError}
        </p>
      )}

      <div className="row">
        <button
          type="button"
          className="primary"
          disabled={!consentChecked || creating}
          onClick={handleStart}
        >
          {creating ? "Creating session…" : "Start exam"}
        </button>
      </div>
    </main>
  );
}

export function ExamStartPage() {
  return (
    <AuthGate>
      <ExamStartInner />
    </AuthGate>
  );
}

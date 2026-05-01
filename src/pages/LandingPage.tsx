/**
 * LandingPage — public, no auth required.
 *
 * Honors v2 decision #9: copy explicitly says Open is honor-system with
 * signal-level proctoring. Verified is gated behind real ID verification and
 * stronger proctoring.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { getWorkbenchHealth, ApiError } from "@/lib/api";
import type { WorkbenchHealthOut } from "@/types/api";

export function LandingPage() {
  const [health, setHealth] = useState<
    | { kind: "loading" }
    | { kind: "ok"; data: WorkbenchHealthOut }
    | { kind: "down"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    getWorkbenchHealth(ctrl.signal)
      .then((data) => setHealth({ kind: "ok", data }))
      .catch((err) => {
        const msg = err instanceof ApiError ? err.message : String(err);
        setHealth({ kind: "down", message: msg });
      });
    return () => ctrl.abort();
  }, []);

  return (
    <>
    <main className="stack-6">
      <section>
        <h1>PoAW Exam</h1>
        <p>
          A timed assessment that measures how well you collaborate with an AI
          assistant on real work. Your results produce a publicly verifiable
          proof you can share with employers.
        </p>
      </section>

      <section>
        <h2>Open vs. Verified</h2>
        <p>
          <strong>Open</strong> is honor-system with signal-level proctoring.
          We log paste, focus, and fingerprint signals, but we don't verify
          your identity and we can't tell if you had help. The score is
          informative, not employer-verifiable.
        </p>
        <p>
          <strong>Verified</strong> includes identity verification (via Plaid),
          stronger proctoring, and produces a public verified proof that
          employers can trust. Verified launches Week 10.
        </p>
        <p>
          <Link to="/exam/start">Start the Open exam →</Link>
          {" · "}
          <Link to="/pricing">See pricing</Link>
        </p>
      </section>

      <section>
        <h2>System status</h2>
        {health.kind === "loading" && (
          <p className="muted">Checking backend…</p>
        )}
        {health.kind === "down" && (
          <p className="error">
            Backend unreachable: {health.message}.{" "}
            <Link to="/">Refresh</Link>
          </p>
        )}
        {health.kind === "ok" && (
          <p className={health.data.status === "ok" ? "success" : "error"}>
            Backend: {health.data.status} · Open enabled:{" "}
            {String(health.data.enabled)} · Verified enabled:{" "}
            {String(health.data.verified_enabled)}
          </p>
        )}
      </section>
    </main>
    <Footer />
    </>
  );
}

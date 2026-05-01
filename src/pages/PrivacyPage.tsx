/**
 * PrivacyPage — public, no auth required.
 *
 * Plan §J Week 6 acceptance: "Privacy/consent docs published".
 * Source: WORKBENCH_SECURITY_PRIVACY_PLAN_v2.md
 *   §2.1 — Open consent text (verbatim)
 *   §2.2 — Verified consent additions (verbatim)
 *   §3   — Data inventory (summarized)
 *   §4   — Data subject rights / DSAR
 *   §5   — Webcam handling
 *   §6   — Plaid Identity Verification
 *
 * GDPR/CCPA section (§7) is flagged ADAM-REVIEW — the plan itself says
 * "lawyer-confirm before launch" — so this page intentionally stops
 * short of legal claims and instead points to the contact route.
 */
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { useDocumentTitle } from "@/lib/useDocumentTitle";


export function PrivacyPage() {
  useDocumentTitle("Privacy & consent");
  return (
    <>
    <main className="legal-page stack-6">
      <header>
        <h1>Privacy &amp; Consent</h1>
        <p className="muted small">
          Last updated: 2026-05-01 · Consent version: <code>wb-consent-2.0</code>
        </p>
      </header>

      <nav aria-label="Sections" className="legal-toc">
        <ol>
          <li><a href="#what-we-collect">What we collect</a></li>
          <li><a href="#open-tier">Open tier consent</a></li>
          <li><a href="#verified-tier">Verified tier consent</a></li>
          <li><a href="#never">What we never store</a></li>
          <li><a href="#retention">Retention</a></li>
          <li><a href="#rights">Your rights</a></li>
          <li><a href="#withdrawal">Withdrawal &amp; deletion</a></li>
          <li><a href="#plaid">About Plaid (Verified only)</a></li>
          <li><a href="#contact">Contact</a></li>
        </ol>
      </nav>

      <section id="what-we-collect">
        <h2>What we collect</h2>
        <p>
          The PoAW Exam is a graded conversation between you and an AI
          assistant. We log enough to grade the work, issue a verifiable
          proof, and keep the score honest. Specifics vary by tier — see
          the Open and Verified sections below.
        </p>

        <table className="data-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>What</th>
              <th>Retention</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Transcript</td>
              <td>All chat messages with the AI assistant</td>
              <td>Indefinite (you can redact)</td>
            </tr>
            <tr>
              <td>Submission</td>
              <td>Final artifact + verification + reflection notes</td>
              <td>Indefinite</td>
            </tr>
            <tr>
              <td>Activity events</td>
              <td>Paste, focus/blur, visibility, fingerprint hash</td>
              <td>Indefinite (small)</td>
            </tr>
            <tr>
              <td>IP</td>
              <td>SHA-256 hash only</td>
              <td>Indefinite</td>
            </tr>
            <tr>
              <td>Webcam snapshots <em>(Verified only)</em></td>
              <td>JPEG frames every 30s + on focus events</td>
              <td><strong>90 days, then automatic deletion</strong></td>
            </tr>
            <tr>
              <td>Identity verification <em>(Verified only)</em></td>
              <td>Plaid result (status + redacted summary + hashed name)</td>
              <td>Indefinite</td>
            </tr>
            <tr>
              <td>Scores &amp; proof</td>
              <td>Numeric scores, public proof payload + Ed25519 signature</td>
              <td>Indefinite</td>
            </tr>
            <tr>
              <td>Payment refs <em>(Verified only)</em></td>
              <td>Square payment id + refund log</td>
              <td>Per Square retention</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="open-tier">
        <h2>Open tier consent</h2>
        <p className="muted">
          Shown in full on the exam start page. Reproduced here verbatim.
        </p>

        <blockquote className="consent-text">
          <p>
            <strong>PoAW Exam — Open Tier Consent</strong>
          </p>
          <p>
            Open is honor-system. We log signals like paste events, focus
            changes, and a browser fingerprint, but we do <strong>not</strong>{" "}
            verify your identity, watch you on camera, or confirm a single
            human took the exam. The Open proof page is informative, not
            employer-grade.
          </p>
          <p>Before you start, please understand what we collect:</p>
          <ul>
            <li>
              <strong>Your transcript with the AI assistant.</strong> Every
              message you send and the assistant's reply. Used to grade your
              work and to issue a proof page.
            </li>
            <li>
              <strong>Activity events.</strong> When you switch tabs, paste
              content into the assistant, or change focus. Logged with the
              session.
            </li>
            <li>
              <strong>Browser fingerprint.</strong> A hash of your screen
              size, browser, timezone, and language. We do not track you
              across sites.
            </li>
            <li>
              <strong>A hash of your IP address.</strong> Not the IP itself.
            </li>
            <li>
              <strong>The work you submit.</strong> Your final artifact and
              your reflection notes.
            </li>
          </ul>
          <p>
            We do <strong>not</strong> record your camera, microphone, or
            screen on the Open tier.
          </p>
          <p>
            Your transcript and submission are kept indefinitely. You can
            request deletion at any time — see <a href="#withdrawal">below</a>.
          </p>
          <p>
            By clicking "I consent" on the start page, you confirm you are at
            least 16 years old and agree to these terms.
          </p>
        </blockquote>
      </section>

      <section id="verified-tier">
        <h2>Verified tier consent (additional)</h2>
        <p className="muted small">
          Verified launches Week 10. The text below is what you'll be asked
          to consent to, in addition to the Open consent above.
        </p>

        <blockquote className="consent-text">
          <p>
            <strong>Verified Tier — Additional Notice</strong>
          </p>
          <p>
            Verified produces an employer-readable credential. To make that
            credible, we verify your identity and proctor the session more
            closely:
          </p>
          <ul>
            <li>
              <strong>Identity verification via Plaid.</strong> You'll
              complete Plaid Identity Verification before starting the exam.
              Plaid handles the document capture and review.{" "}
              <strong>
                Plaid is the system of record for your ID document — we never
                receive or store the document image itself.
              </strong>{" "}
              We receive only the verification result (passed/failed/manual
              review), a redacted summary, and a hashed reference to your
              verified legal name. Plaid's privacy policy applies to the
              document handling; review it at the start of the verification
              flow.
            </li>
            <li>
              <strong>Webcam snapshots</strong> every 30 seconds and on
              certain events. Stored in our private cloud storage and{" "}
              <strong>automatically deleted after 90 days</strong>. Used only
              to verify a single human took the exam.
            </li>
            <li>
              <strong>A clear, employer-readable proof page</strong> is
              generated when you finish.
            </li>
            <li>
              <strong>Browser requirement.</strong> Verified requires Chrome
              or Edge. Other browsers don't have stable enough webcam APIs
              for reliable proctoring.
            </li>
          </ul>
          <p>
            If your camera permission is revoked during the exam, your
            session continues but is flagged for human review before a
            Verified credential is issued.
          </p>
        </blockquote>
      </section>

      <section id="never">
        <h2>What we never store</h2>
        <ul>
          <li>Raw IP addresses (only a SHA-256 hash).</li>
          <li>The content of pasted text (only its length and a classifier label).</li>
          <li>Canvas or WebGL fingerprints.</li>
          <li>Microphone audio.</li>
          <li>Screen recordings.</li>
          <li>
            Your government ID document image{" "}
            <em>(Plaid handles document capture; we never receive it)</em>.
          </li>
          <li>Raw Plaid payloads (only a hash + redacted summary).</li>
          <li>Real keystroke content (only modifier+key indicators for proctoring).</li>
        </ul>
      </section>

      <section id="retention">
        <h2>Retention</h2>
        <ul>
          <li>
            <strong>Webcam snapshots:</strong> 90 days, then a daily Celery
            job automatically deletes them from S3. We emit a public metric
            (<code>wb_oldest_webcam_snapshot_age_days</code>) that alerts if
            it ever exceeds 91.
          </li>
          <li>
            <strong>Grader prompts and outputs:</strong> 2 years, for
            calibration and dispute review.
          </li>
          <li>
            <strong>Admin access log:</strong> 2 years.
          </li>
          <li>
            <strong>Transcripts, submissions, scores, proofs:</strong>{" "}
            indefinite, with self-serve redaction and revocation (see
            "withdrawal" below).
          </li>
        </ul>
      </section>

      <section id="rights">
        <h2>Your rights</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Right</th>
              <th>How to exercise it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Access</td>
              <td>
                Request a JSON export at{" "}
                <code>GET /api/v1/workbench/me/export</code> — we return a
                zipped bundle of your transcripts, scores, proofs, and
                identity verification status. SLA 7 days.
              </td>
            </tr>
            <tr>
              <td>Erasure</td>
              <td>
                Account → exam attempts → "Delete attempt." Transcript
                replaced with <code>[REDACTED]</code>; webcam snapshots
                deleted from S3 within 7 days.
              </td>
            </tr>
            <tr>
              <td>Restriction</td>
              <td>
                Pause public proof rendering pending review. Use the
                "Withdraw proof" action.
              </td>
            </tr>
            <tr>
              <td>Portability</td>
              <td>The JSON export is portable.</td>
            </tr>
            <tr>
              <td>Object</td>
              <td>Withdraw from norming dataset / public percentile pool via account settings.</td>
            </tr>
          </tbody>
        </table>

        <p className="adam-review small">
          <strong>ADAM-REVIEW:</strong> GDPR/CCPA-specific lawful-basis
          language and DSAR SLAs require legal review before public Verified
          launch (per Security &amp; Privacy Plan §7). This page intentionally
          stops at functional rights and does not make jurisdiction-specific
          claims yet.
        </p>
      </section>

      <section id="withdrawal">
        <h2>Withdrawal &amp; deletion</h2>
        <ul>
          <li>
            <strong>Mid-session withdrawal:</strong> click "Cancel session";
            capture stops immediately. Partial data is purged within 24h on
            request.
          </li>
          <li>
            <strong>Post-session deletion:</strong> Account → exam attempts
            → "Delete attempt." Transcript content is replaced with{" "}
            <code>[REDACTED]</code>; the row itself is preserved for audit.
            Webcam snapshots and proctor artifacts are deleted from S3
            within 7 days.{" "}
            <strong>
              Plaid identity records are marked withdrawn on our side, but
              provider-side deletion follows Plaid's retention policy, not
              ours.
            </strong>
          </li>
          <li>
            <strong>Public proof revocation:</strong> The public URL flips
            to a generic 410 ("This proof is no longer available."). The
            reason is never disclosed publicly — verifiers see only that the
            proof was withdrawn.
          </li>
        </ul>
      </section>

      <section id="plaid">
        <h2>About Plaid (Verified tier only)</h2>
        <p>
          Plaid Identity Verification is the system of record for your
          government ID document. When you complete Plaid IDV inside the
          Verified flow:
        </p>
        <ul>
          <li>
            Plaid captures your document and runs OCR, liveness check, and
            decision in <em>their</em> infrastructure.
          </li>
          <li>
            We receive only the verification result (passed / failed /
            manual review), a redacted summary, and a hashed reference to
            your verified legal name. We do not receive the document image.
          </li>
          <li>
            Plaid's privacy policy applies to the document handling itself;
            you'll see and have to accept it inside the Plaid Link UI before
            the document is captured.
          </li>
          <li>
            Plaid's webhook updates are signature-verified and idempotent on
            our side.
          </li>
        </ul>
      </section>

      <section id="contact">
        <h2>Contact</h2>
        <p>
          Privacy questions, deletion requests, or anything that doesn't
          have a self-serve flow:{" "}
          <a href="mailto:privacy@proofofaiwork.com">
            privacy@proofofaiwork.com
          </a>
          .
        </p>
        <p className="muted small">
          See also: <Link to="/pricing">Pricing</Link>{" · "}
          <Link to="/verify">Verify a proof</Link>
        </p>
      </section>
    </main>
    <Footer />
    </>
  );
}

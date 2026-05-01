/**
 * Footer — shared across public pages.
 *
 * Auth-gated exam pages (ExamStart / ExamSession) deliberately skip this
 * to keep candidates in focus mode.
 */
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-grid">
        <section>
          <h3>PoAW Exam</h3>
          <p className="muted small">
            A timed assessment that measures how well you collaborate with an AI assistant on real
            work.
          </p>
        </section>

        <section>
          <h3>Product</h3>
          <ul>
            <li>
              <Link to="/">Overview</Link>
            </li>
            <li>
              <Link to="/pricing">Pricing</Link>
            </li>
            <li>
              <Link to="/exam/start">Start the exam</Link>
            </li>
          </ul>
        </section>

        <section>
          <h3>Verification</h3>
          <ul>
            <li>
              <Link to="/verify">Verify a proof</Link>
            </li>
            <li>
              <a
                href="https://github.com/adam-scott-thomas/proofofaiwork-exam"
                target="_blank"
                rel="noreferrer"
              >
                Source
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h3>Legal</h3>
          <ul>
            <li>
              <Link to="/privacy">Privacy &amp; consent</Link>
            </li>
            <li>
              <a href="mailto:privacy@proofofaiwork.com">privacy@proofofaiwork.com</a>
            </li>
          </ul>
        </section>
      </div>

      <p className="footer-copy muted small">
        © {new Date().getFullYear()} ProofOfAIWork · Verification runs in your browser via Ed25519
      </p>
    </footer>
  );
}

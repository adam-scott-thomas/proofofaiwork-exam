/**
 * PricingPage — public, no auth required.
 *
 * Plan §J Week 6: "Pricing page live with Open vs. Verified split
 * (Verified shown as 'coming soon')".
 * Plan §H.1 drives the comparison table.
 *
 * Verified column flips from "coming soon" → "available" at Week 10
 * (per plan §J Week 8, Track 2). Until then it's a teaser.
 */
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";


export function PricingPage() {
  return (
    <>
    <main className="pricing-page stack-6">
      <header>
        <h1>Pricing</h1>
        <p className="muted">
          Two tiers. Open is honor-system; Verified is employer-grade.
        </p>
      </header>

      <section className="tier-grid">
        <TierCard
          name="Open"
          price="Free"
          tagline="Take the exam, get a score, share the proof."
          ctaLabel="Start the Open exam"
          ctaTo="/exam/start"
          available
          features={OPEN_FEATURES}
          footnote="Honor-system: we log paste, focus, and fingerprint signals, but we don't verify your identity."
        />

        <TierCard
          name="Verified"
          price="$49"
          tagline="Identity-verified, webcam-proctored, employer-trusted."
          ctaLabel="Available Week 10"
          ctaTo={null}
          available={false}
          features={VERIFIED_FEATURES}
          footnote="Plaid identity verification, periodic webcam snapshots, Chrome or Edge only. Refundable within 30 days if you withdraw."
        />
      </section>

      <section>
        <h2>How verification works</h2>
        <p>
          Every Open and Verified result produces an Ed25519-signed proof at{" "}
          <code>assessment.proofofaiwork.com/p/&lt;id&gt;</code>. Anyone can{" "}
          <Link to="/verify">verify the signature offline</Link> in their
          browser — no trust placed on our server.
        </p>
        <p className="muted small">
          The difference between tiers is what's <em>inside</em> the proof.
          Verified payloads carry the identity-verified flag; Open payloads
          do not.
        </p>
      </section>

      <section>
        <h2>FAQ</h2>
        <details>
          <summary>Can I retake the exam?</summary>
          <p>
            Yes. There's a 7-day cooldown between attempts; the headline score
            is the best of your last 5 attempts within a 90-day window.
          </p>
        </details>
        <details>
          <summary>What if I lose my Verified attempt to a technical issue?</summary>
          <p>
            Grading-correction refunds are full refunds. Reach out to{" "}
            <a href="mailto:support@proofofaiwork.com">support</a> within 30
            days of the attempt.
          </p>
        </details>
        <details>
          <summary>Why is Verified not Stripe?</summary>
          <p>We process Verified payments through Square.</p>
        </details>
      </section>
    </main>
    <Footer />
    </>
  );
}


// --------------------------- subcomponents ---------------------------------


interface Feature {
  label: string;
  open: "yes" | "no" | string;
  verified: "yes" | "no" | string;
}

const OPEN_FEATURES: Feature[] = [
  { label: "Composite + 6-dimension score", open: "yes", verified: "yes" },
  { label: "Public verifiable proof URL", open: "yes", verified: "yes" },
  { label: "Diagnostic report", open: "yes", verified: "yes" },
  { label: "Paste / focus / fingerprint signals", open: "yes", verified: "yes" },
  { label: "Identity verification (Plaid)", open: "no", verified: "yes" },
  { label: "Webcam snapshots", open: "no", verified: "every 30s" },
  { label: "Browser support", open: "broad", verified: "Chrome + Edge" },
];

const VERIFIED_FEATURES = OPEN_FEATURES;


function TierCard({
  name,
  price,
  tagline,
  features,
  ctaLabel,
  ctaTo,
  available,
  footnote,
}: {
  name: string;
  price: string;
  tagline: string;
  features: Feature[];
  ctaLabel: string;
  ctaTo: string | null;
  available: boolean;
  footnote: string;
}) {
  return (
    <article className={`tier-card ${available ? "tier-available" : "tier-soon"}`}>
      <header>
        <h2>{name}</h2>
        <p className="tier-price">{price}</p>
        <p className="tier-tagline">{tagline}</p>
      </header>

      <ul className="tier-features">
        {features.map((f) => (
          <li key={f.label}>
            <span className="feat-label">{f.label}</span>
            <span className="feat-value">
              {name === "Open" ? f.open : f.verified}
            </span>
          </li>
        ))}
      </ul>

      <p className="tier-cta">
        {ctaTo ? (
          <Link to={ctaTo} className="cta-button">
            {ctaLabel}
          </Link>
        ) : (
          <span className="cta-disabled" aria-disabled="true">
            {ctaLabel}
          </span>
        )}
      </p>

      <p className="tier-footnote muted small">{footnote}</p>
    </article>
  );
}

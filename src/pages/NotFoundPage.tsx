import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";

export function NotFoundPage() {
  return (
    <>
      <main className="not-found stack-3">
        <h1>Not found</h1>
        <p className="muted">No page matches that URL.</p>
        <p>
          <Link to="/">Back to landing</Link>
          {" · "}
          <Link to="/pricing">Pricing</Link>
          {" · "}
          <Link to="/verify">Verify a proof</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}

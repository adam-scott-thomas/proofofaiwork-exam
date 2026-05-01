import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export function NotFoundPage() {
  useDocumentTitle("Not found");
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

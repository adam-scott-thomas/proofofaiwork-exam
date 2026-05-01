import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="stack-3">
      <h1>Not found</h1>
      <p className="muted">No page matches that URL.</p>
      <p>
        <Link to="/">Back to landing</Link>
      </p>
    </main>
  );
}

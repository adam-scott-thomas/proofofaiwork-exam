/**
 * ExamSessionPage — the actual exam experience. Skeleton only.
 *
 * Week 1 scope: open the WS using lib/ws.ts (token in first message), show
 * connection state, render a placeholder for the section/chat UI.
 *
 * Week 2 scope (NOT in this scaffold):
 *   - Section navigator (Diagnose → Perform → Repair).
 *   - Streaming chat panel with model picker.
 *   - Submit-section flow with the server-side deadline guard.
 *   - Proctoring banner (Open shows "signal-level" pill; Verified shows
 *     "Recording" pill).
 */

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AuthGate } from "@/components/AuthGate";
import { connectWorkbenchWs, type WsConnection, type WsState } from "@/lib/ws";

function ExamSessionInner() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [wsState, setWsState] = useState<WsState>("connecting");
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const [closeReason, setCloseReason] = useState<string | null>(null);
  const wsRef = useRef<WsConnection | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cleanup = false;

    try {
      const conn = connectWorkbenchWs(sessionId, {
        onStateChange: (s) => {
          if (!cleanup) setWsState(s);
        },
        onMessage: (msg) => {
          if (!cleanup) setLastMessage(msg);
        },
        onClose: (code, reason) => {
          if (!cleanup) setCloseReason(`closed (${code}) ${reason}`);
        },
      });
      wsRef.current = conn;
    } catch (err) {
      setWsState("error");
      setCloseReason(err instanceof Error ? err.message : String(err));
    }

    return () => {
      cleanup = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <main>
        <h1>Missing session id</h1>
        <p className="error">URL did not include a session id.</p>
      </main>
    );
  }

  return (
    <main className="stack-6">
      <header>
        <h1>Exam session</h1>
        <p className="muted">
          Session <code>{sessionId}</code>
        </p>
      </header>

      <section>
        <h2>Connection</h2>
        <p>
          WebSocket: <strong>{wsState}</strong>
          {closeReason && (
            <>
              {" "}
              · <span className="muted">{closeReason}</span>
            </>
          )}
        </p>
      </section>

      <section>
        <h2>Section UI</h2>
        <p className="muted">
          Section navigator, streaming chat, and submit flow land Week 2. This
          page is a connection-only skeleton.
        </p>
        {lastMessage !== null && (
          <pre
            style={{
              background: "var(--color-border)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-sm)",
              overflow: "auto",
            }}
          >
            {JSON.stringify(lastMessage, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}

export function ExamSessionPage() {
  return (
    <AuthGate>
      <ExamSessionInner />
    </AuthGate>
  );
}

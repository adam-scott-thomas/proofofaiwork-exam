/**
 * WebSocket helper for the chat transport.
 *
 * Per v2 decision #1: the auth token goes in the FIRST CLIENT MESSAGE,
 * NOT in the URL. This avoids leaking tokens to access logs, CDNs, and
 * browser history.
 *
 * Wire protocol (v1):
 *   1. Client opens ws://.../api/v1/workbench/ws
 *   2. Server accepts, awaits first frame for ≤5s
 *   3. Client sends: {"type":"hello","token":"<jwt>","session_id":"<uuid>"}
 *   4. Server responds: {"type":"hello_ack"} or closes with code 4401 on bad auth
 *   5. Server sends {"type":"ping","server_ts":"..."} every ~25s; client
 *      MUST reply with {"type":"pong","client_ts":<server_ts>} within 10s
 *      or the server closes the connection. Handled in this module so
 *      consumers don't have to know.
 *   6. Subsequent frames flow per the chat protocol
 *
 * This module is a thin wrapper around connection lifecycle + keepalive.
 * The chat reducer that consumes events lives in the ExamSession page.
 *
 * STUB: full chat-message types land Week 2.
 */

import { getToken } from "@/lib/auth";

function resolveWsBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;
  if (typeof window === "undefined") return "ws://localhost";
  return (window.location.protocol === "https:" ? "wss:" : "ws:") + "//" + window.location.host;
}

export type WsState = "connecting" | "authed" | "closed" | "error";

export interface WsHandlers {
  onAuthed?: () => void;
  onMessage?: (msg: unknown) => void;
  onStateChange?: (state: WsState) => void;
  onClose?: (code: number, reason: string) => void;
}

export interface WsConnection {
  send: (msg: unknown) => void;
  close: () => void;
}

export function connectWorkbenchWs(sessionId: string, handlers: WsHandlers): WsConnection {
  const token = getToken();
  if (!token) {
    handlers.onStateChange?.("error");
    throw new Error("connectWorkbenchWs: no token in localStorage");
  }

  const url = `${resolveWsBaseUrl()}/api/v1/workbench/ws`;
  const ws = new WebSocket(url);
  let state: WsState = "connecting";
  let authTimer: ReturnType<typeof setTimeout> | null = null;

  function setState(next: WsState): void {
    state = next;
    handlers.onStateChange?.(next);
  }

  ws.addEventListener("open", () => {
    // Per v2 decision #1: token goes in the FIRST MESSAGE, not the URL.
    const helloFrame = {
      type: "hello",
      token,
      session_id: sessionId,
    };
    ws.send(JSON.stringify(helloFrame));

    // If the server doesn't ack within 5s, treat as auth failure.
    authTimer = setTimeout(() => {
      if (state === "connecting") {
        ws.close(4401, "hello_ack timeout");
        setState("error");
      }
    }, 5000);
  });

  ws.addEventListener("message", (ev) => {
    let msg: unknown;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      // Non-JSON frame; ignore.
      return;
    }

    if (typeof msg !== "object" || msg === null) {
      handlers.onMessage?.(msg);
      return;
    }
    const typed = msg as { type?: string; server_ts?: string };

    if (typed.type === "hello_ack") {
      if (authTimer !== null) {
        clearTimeout(authTimer);
        authTimer = null;
      }
      setState("authed");
      handlers.onAuthed?.();
      return;
    }

    // App-level keepalive. Backend closes the connection if it doesn't
    // receive a pong within 10s of its ping. Echo server_ts back as
    // client_ts so the server can match them up.
    if (typed.type === "ping" && typeof typed.server_ts === "string") {
      try {
        ws.send(JSON.stringify({ type: "pong", client_ts: typed.server_ts }));
      } catch {
        /* socket closing; nothing to do */
      }
      return;
    }

    handlers.onMessage?.(msg);
  });

  ws.addEventListener("close", (ev) => {
    if (authTimer !== null) clearTimeout(authTimer);
    setState("closed");
    handlers.onClose?.(ev.code, ev.reason);
  });

  ws.addEventListener("error", () => {
    setState("error");
  });

  return {
    send(msg: unknown) {
      if (ws.readyState !== WebSocket.OPEN) {
        throw new Error("ws is not open");
      }
      ws.send(JSON.stringify(msg));
    },
    close() {
      ws.close(1000, "client closed");
    },
  };
}

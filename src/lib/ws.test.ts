/**
 * WebSocket transport tests.
 *
 * These don't talk to a real server — they install a mock WebSocket
 * implementation and assert the transport's reaction to inbound frames.
 *
 * Why these matter:
 *   - The hello_ack happy path is the only thing standing between the
 *     candidate and a perpetually "connecting" UI.
 *   - The ping/pong handler keeps the connection alive past 25s. Without
 *     it the server closes us, no test fails, and the regression is only
 *     visible to users in the wild.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { connectWorkbenchWs } from "./ws";

// Minimal stand-in for the parts of the DOM WebSocket interface we use.
interface MockSocket {
  readyState: number;
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  // Test hooks
  _open: () => void;
  _message: (data: unknown) => void;
  _close: (code: number, reason: string) => void;
  _error: () => void;
  _sent: string[];
}

function makeMockWebSocket(): { Mock: typeof WebSocket; latest: () => MockSocket } {
  let latest: MockSocket | null = null;

  // Constructor we install at globalThis.WebSocket. Records every send()
  // and exposes _open/_message/_close hooks so tests can drive lifecycle.
  function MockCtor(this: unknown, _url: string): MockSocket {
    const sent: string[] = [];
    const listeners: Record<
      string,
      ((ev: { data?: string; code?: number; reason?: string }) => void)[]
    > = {};
    const sock: MockSocket = {
      readyState: 0, // CONNECTING
      send(data: string) {
        sent.push(data);
      },
      close(_code?: number, _reason?: string) {
        sock.readyState = 3;
      },
      _open() {
        sock.readyState = 1; // OPEN
        listeners.open?.forEach((cb) => cb({}));
      },
      _message(data: unknown) {
        const text = typeof data === "string" ? data : JSON.stringify(data);
        listeners.message?.forEach((cb) => cb({ data: text }));
      },
      _close(code: number, reason: string) {
        sock.readyState = 3;
        listeners.close?.forEach((cb) => cb({ code, reason }));
      },
      _error() {
        listeners.error?.forEach((cb) => cb({}));
      },
      _sent: sent,
    };

    // The transport uses .addEventListener — proxy it onto our listeners map.
    (
      sock as unknown as {
        addEventListener: (type: string, cb: (ev: unknown) => void) => void;
      }
    ).addEventListener = (type, cb) => {
      (listeners[type] ||= []).push(
        cb as (ev: { data?: string; code?: number; reason?: string }) => void,
      );
    };

    latest = sock;
    return sock;
  }

  // Keep the readyState enum identifiers the transport expects.
  (MockCtor as unknown as { OPEN: number; CONNECTING: number; CLOSED: number }).OPEN = 1;
  (MockCtor as unknown as { OPEN: number; CONNECTING: number; CLOSED: number }).CONNECTING = 0;
  (MockCtor as unknown as { OPEN: number; CONNECTING: number; CLOSED: number }).CLOSED = 3;

  return {
    Mock: MockCtor as unknown as typeof WebSocket,
    latest: () => {
      if (latest === null) throw new Error("no MockWebSocket constructed yet");
      return latest;
    },
  };
}

describe("connectWorkbenchWs", () => {
  let restore: () => void;
  let latest: () => MockSocket;

  beforeEach(() => {
    // Stub localStorage with a token so the transport doesn't bail.
    vi.stubGlobal("localStorage", {
      getItem(k: string) {
        if (k === "poaw_workbench_token_v1") return "test-token";
        if (k === "poaw_workbench_token_exp_v1") {
          return new Date(Date.now() + 60_000).toISOString();
        }
        return null;
      },
      setItem() {
        /* noop */
      },
      removeItem() {
        /* noop */
      },
    });

    const { Mock, latest: getLatest } = makeMockWebSocket();
    vi.stubGlobal("WebSocket", Mock);
    latest = getLatest;

    restore = () => {
      vi.unstubAllGlobals();
    };
  });

  afterEach(() => {
    restore();
  });

  it("sends a hello frame on open and transitions to authed on hello_ack", () => {
    const onAuthed = vi.fn();
    const onState = vi.fn();
    connectWorkbenchWs("00000000-0000-0000-0000-000000000001", {
      onAuthed,
      onStateChange: onState,
    });

    const sock = latest();
    sock._open();

    // First frame the client sends MUST be the hello with token + session_id.
    expect(sock._sent.length).toBe(1);
    const hello = JSON.parse(sock._sent[0]!);
    expect(hello).toMatchObject({
      type: "hello",
      token: "test-token",
      session_id: "00000000-0000-0000-0000-000000000001",
    });

    // Server acks → client transitions to authed.
    sock._message({ type: "hello_ack", server_ts: "2026-05-01T00:00:00Z" });
    expect(onAuthed).toHaveBeenCalled();
    expect(onState).toHaveBeenCalledWith("authed");
  });

  it("auto-replies to server ping with pong echoing server_ts as client_ts", () => {
    const onMessage = vi.fn();
    connectWorkbenchWs("00000000-0000-0000-0000-000000000002", { onMessage });

    const sock = latest();
    sock._open();
    sock._message({ type: "hello_ack", server_ts: "2026-05-01T00:00:00Z" });

    // Server sends a keepalive ping. Frontend must auto-pong; the consumer
    // (onMessage handler) must NOT see the ping — it's a transport detail.
    sock._message({ type: "ping", server_ts: "2026-05-01T00:00:30Z" });

    // Frames so far: [hello, pong]
    expect(sock._sent.length).toBe(2);
    const pong = JSON.parse(sock._sent[1]!);
    expect(pong).toEqual({
      type: "pong",
      client_ts: "2026-05-01T00:00:30Z",
    });

    // The ping frame should NOT have been forwarded to the consumer.
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("forwards non-ping non-hello_ack messages to onMessage", () => {
    const onMessage = vi.fn();
    connectWorkbenchWs("00000000-0000-0000-0000-000000000003", { onMessage });

    const sock = latest();
    sock._open();
    sock._message({ type: "hello_ack", server_ts: "2026-05-01T00:00:00Z" });

    // Real chat event — must reach the consumer.
    const chatEvent = {
      type: "event",
      event_id: "1700000000000-0",
      kind: "token",
      payload: { delta: "Hi" },
    };
    sock._message(chatEvent);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(chatEvent);
  });

  it("ignores non-JSON inbound frames without crashing", () => {
    const onMessage = vi.fn();
    connectWorkbenchWs("00000000-0000-0000-0000-000000000004", { onMessage });

    const sock = latest();
    sock._open();

    // Non-JSON garbage — transport must not propagate or throw.
    sock._message("not json");
    expect(onMessage).not.toHaveBeenCalled();
  });
});

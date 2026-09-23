import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fakes = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;

  class Emitter {
    handlers = new Map<string, Handler[]>();
    on(ev: string, fn: Handler) {
      this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), fn]);
      return this;
    }
    once(ev: string, fn: Handler) {
      const wrapped: Handler = (...args) => {
        this.handlers.set(
          ev,
          (this.handlers.get(ev) ?? []).filter((h) => h !== wrapped)
        );
        fn(...args);
      };
      return this.on(ev, wrapped);
    }
    emit(ev: string, ...args: unknown[]) {
      for (const fn of [...(this.handlers.get(ev) ?? [])]) fn(...args);
    }
    removeAllListeners() {
      this.handlers.clear();
      return this;
    }
  }

  class FakeConn extends Emitter {
    close() {}
  }

  class FakePeer extends Emitter {
    conns: FakeConn[] = [];
    constructor() {
      super();
      peers.push(this);
    }
    connect() {
      const c = new FakeConn();
      this.conns.push(c);
      return c;
    }
    destroy() {}
  }

  const peers: FakePeer[] = [];
  return { peers, FakePeer };
});

vi.mock("peerjs", () => ({ Peer: fakes.FakePeer }));
vi.mock("@tauri-apps/api/event", () => ({ emit: vi.fn(() => Promise.resolve()) }));
vi.mock("./mech-store.svelte", () => ({ mechStore: { setBossStatus: vi.fn() } }));
vi.mock("./utils/capture-buffer.svelte", () => ({ recordBossStatus: vi.fn() }));

const SHARE_URL = "https://live.lostark.bible/abc123";

async function freshPeerState() {
  vi.resetModules();
  return (await import("./mech-peer.svelte")).peerState;
}

beforeEach(() => {
  fakes.peers.length = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("peerState connect timeout", () => {
  it("errors with 'Connection timed out' after 15 s when the peer never answers", async () => {
    const peerState = await freshPeerState();
    void peerState.connect(SHARE_URL);
    expect(peerState.status).toBe("connecting");

    await vi.advanceTimersByTimeAsync(14_999);
    expect(peerState.status).toBe("connecting");

    await vi.advanceTimersByTimeAsync(1);
    expect(peerState.status).toBe("error");
    expect(peerState.errorMsg).toBe("Connection timed out");

    // A late open cannot flip the status back: the timeout removed every listener.
    fakes.peers[0].emit("open");
    await vi.advanceTimersByTimeAsync(0);
    expect(peerState.status).toBe("error");
  });

  it("also times out when the signaling peer opens but the data connection never does", async () => {
    const peerState = await freshPeerState();
    const pending = peerState.connect(SHARE_URL);
    fakes.peers[0].emit("open");
    await pending;
    expect(peerState.status).toBe("connecting");

    await vi.advanceTimersByTimeAsync(15_000);
    expect(peerState.status).toBe("error");
    expect(peerState.errorMsg).toBe("Connection timed out");
  });

  it("leaves a connection that opened in time alone", async () => {
    const peerState = await freshPeerState();
    const pending = peerState.connect(SHARE_URL);
    fakes.peers[0].emit("open");
    await pending;
    fakes.peers[0].conns[0].emit("open");
    expect(peerState.status).toBe("connected");

    await vi.advanceTimersByTimeAsync(15_000);
    expect(peerState.status).toBe("connected");
    expect(peerState.errorMsg).toBeNull();
  });
});

describe("peerState dropCount", () => {
  async function connected() {
    const peerState = await freshPeerState();
    const pending = peerState.connect(SHARE_URL);
    fakes.peers[0].emit("open");
    await pending;
    fakes.peers[0].conns[0].emit("open");
    expect(peerState.status).toBe("connected");
    return peerState;
  }

  it("increments when an open connection closes on its own", async () => {
    const peerState = await connected();
    expect(peerState.dropCount).toBe(0);

    fakes.peers[0].conns[0].emit("close");
    expect(peerState.status).toBe("disconnected");
    expect(peerState.dropCount).toBe(1);
  });

  it("stays unchanged on a deliberate disconnect()", async () => {
    const peerState = await connected();
    peerState.disconnect();
    expect(peerState.status).toBe("disconnected");
    expect(peerState.dropCount).toBe(0);
  });
});

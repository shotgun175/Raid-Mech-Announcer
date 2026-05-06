import { Peer, type DataConnection } from "peerjs";
import { mechStore } from "./mech-store.svelte";
import type { BossStatusData } from "./mech-types";

export type PeerStatus = "disconnected" | "connecting" | "connected" | "error";

export type { BossStatusData } from "./mech-types";

export const peerState = (() => {
  let status = $state<PeerStatus>("disconnected");
  let errorMsg = $state<string | null>(null);
  let debugLog = $state<string[]>([]);
  let peer: Peer | null = null;
  let conn: DataConnection | null = null;
  let connectId = 0; // incremented on each connect() call to detect stale callbacks

  function parsePeerId(input: string): string {
    const trimmed = input.trim();
    try {
      const url = new URL(trimmed);
      return url.pathname.replace(/^\//, "");
    } catch {
      return trimmed;
    }
  }

  function cleanupPeer() {
    if (conn) {
      conn.removeAllListeners();
      conn.close();
      conn = null;
    }
    if (peer) {
      peer.removeAllListeners();
      peer.destroy();
      peer = null;
    }
  }

  async function connect(urlOrId: string): Promise<void> {
    const peerId = parsePeerId(urlOrId);
    if (!peerId) {
      errorMsg = "Invalid peer ID or URL";
      status = "error";
      return;
    }

    // Increment to invalidate any in-flight callbacks from previous attempts
    const myId = ++connectId;

    cleanupPeer();
    status = "connecting";
    errorMsg = null;

    const newPeer = new Peer();
    peer = newPeer;

    const opened = await new Promise<boolean>((resolve) => {
      newPeer.once("open", () => resolve(true));
      newPeer.once("error", (e) => {
        if (connectId === myId) {
          status = "error";
          errorMsg = e instanceof Error ? e.message : String(e);
          mechStore.setBossStatus(null);
        }
        resolve(false);
      });
    });

    if (!opened || connectId !== myId) {
      cleanupPeer();
      return;
    }

    const newConn = newPeer.connect(peerId, { reliable: true });
    conn = newConn;

    newConn.on("open", () => {
      if (connectId !== myId) return;
      status = "connected";
    });

    newConn.on("data", (raw) => {
      if (connectId !== myId) return;
      const msg = raw as { type: string; data: BossStatusData | null };
      if (msg.type === "bossStatus") {
        const d = msg.data;
        const entry = d ? `${d.currentBars}/${d.totalBars} dead:${d.isDead} · ${d.name}` : "— null";
        debugLog = [...debugLog, entry].slice(-15);
        mechStore.setBossStatus(msg.data);
      }
    });

    newConn.on("close", () => {
      if (connectId !== myId) return;
      status = "disconnected";
      mechStore.setBossStatus(null);
    });

    newConn.on("error", (e) => {
      if (connectId !== myId) return;
      status = "error";
      errorMsg = e instanceof Error ? e.message : String(e);
      mechStore.setBossStatus(null);
    });

    newPeer.on("error", (e) => {
      if (connectId !== myId) return;
      status = "error";
      errorMsg = e instanceof Error ? e.message : String(e);
      mechStore.setBossStatus(null);
    });
  }

  function disconnect() {
    connectId++; // invalidate any in-flight callbacks
    cleanupPeer();
    status = "disconnected";
    errorMsg = null;
    mechStore.setBossStatus(null);
  }

  return {
    get status() {
      return status;
    },
    get errorMsg() {
      return errorMsg;
    },
    get isConnected() {
      return status === "connected";
    },
    get debugLog() {
      return debugLog;
    },
    clearDebugLog() {
      debugLog = [];
    },
    connect,
    disconnect
  };
})();

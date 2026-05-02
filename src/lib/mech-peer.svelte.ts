import { Peer, type DataConnection } from "peerjs";
import { mechStore } from "./mech-store.svelte";

export type PeerStatus = "disconnected" | "connecting" | "connected" | "error";

export const peerState = (() => {
  let status = $state<PeerStatus>("disconnected");
  let errorMsg = $state<string | null>(null);
  let peer: Peer | null = null;
  let conn: DataConnection | null = null;

  function parsePeerId(input: string): string {
    const trimmed = input.trim();
    try {
      const url = new URL(trimmed);
      return url.pathname.replace(/^\//, "");
    } catch {
      return trimmed;
    }
  }

  async function connect(urlOrId: string): Promise<void> {
    const peerId = parsePeerId(urlOrId);
    if (!peerId) {
      errorMsg = "Invalid peer ID or URL";
      status = "error";
      return;
    }

    disconnect();
    status = "connecting";
    errorMsg = null;

    peer = new Peer();

    await new Promise<void>((resolve, reject) => {
      peer!.once("open", () => resolve());
      peer!.once("error", (e) => reject(e));
    }).catch((e) => {
      status = "error";
      errorMsg = String(e);
      peer?.destroy();
      peer = null;
      throw e;
    });

    conn = peer.connect(peerId, { reliable: true });

    conn.on("open", () => {
      status = "connected";
    });

    conn.on("data", (raw) => {
      const msg = raw as { type: string; data: BossStatusData | null };
      if (msg.type === "bossStatus") {
        mechStore.setBossStatus(msg.data);
      }
    });

    conn.on("close", () => {
      status = "disconnected";
      mechStore.setBossStatus(null);
    });

    conn.on("error", (e) => {
      status = "error";
      errorMsg = String(e);
      mechStore.setBossStatus(null);
    });

    peer.on("error", (e) => {
      status = "error";
      errorMsg = String(e);
      mechStore.setBossStatus(null);
    });
  }

  function disconnect() {
    conn?.close();
    peer?.destroy();
    conn = null;
    peer = null;
    status = "disconnected";
    errorMsg = null;
    mechStore.setBossStatus(null);
  }

  return {
    get status() { return status; },
    get errorMsg() { return errorMsg; },
    get isConnected() { return status === "connected"; },
    connect,
    disconnect,
  };
})();

export interface BossStatusData {
  name: string;
  isDead: boolean;
  currentHp: number;
  maxHp: number;
  currentShield: number;
  totalBars: number;
  currentBars: number;
}

<script lang="ts">
  import { readText } from "@tauri-apps/plugin-clipboard-manager";
  import { peerState } from "$lib/mech-peer.svelte";
  import { mechStore } from "$lib/mech-store.svelte";

  let input = $state("");

  const statusColor = $derived(
    peerState.status === "connected"
      ? "#4ade80"
      : peerState.status === "connecting"
        ? "#fbbf24"
        : peerState.status === "error"
          ? "#f87171"
          : "#38bdf8"
  );

  const statusLabel = $derived(
    peerState.status === "connected"
      ? `Live · ${mechStore.liveBossName ?? "connected"}`
      : peerState.status === "connecting"
        ? "Connecting…"
        : peerState.status === "error"
          ? (peerState.errorMsg ?? "Error")
          : "Waiting for LOA Logs share…"
  );

  const statusTextColor = $derived(
    peerState.status === "connected" ? "#86efac" : peerState.status === "error" ? "#fca5a5" : "#d4d4d4"
  );

  async function pasteFromClipboard() {
    try {
      const text = await readText();
      if (text) input = text.trim();
    } catch {
      try {
        const text = await navigator.clipboard.readText();
        if (text) input = text.trim();
      } catch {}
    }
  }

  function handleConnect() {
    if (input.trim()) peerState.connect(input.trim());
  }
</script>

<div
  style="border-top: 1px solid #404040; padding: 6px 14px; flex-shrink: 0; background: #111111; display: flex; align-items: center; gap: 8px; min-height: 36px;"
>
  <!-- status dot -->
  <div
    style="width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: {statusColor}; box-shadow: 0 0 6px {statusColor}; animation: mech-pulse 2s ease-in-out infinite;"
  ></div>

  <!-- status text -->
  <span
    style="font-size: 12px; color: {statusTextColor}; font-weight: {peerState.status === 'connected'
      ? 600
      : 400}; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
  >
    {statusLabel}
  </span>

  {#if peerState.isConnected}
    <button
      onclick={() => peerState.disconnect()}
      style="font-size: 11px; font-weight: 600; color: #f87171; background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); cursor: pointer; padding: 3px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; font-family: inherit;"
      onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.2)")}
      onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)")}
    >
      Disconnect
    </button>
  {:else}
    <button
      onclick={pasteFromClipboard}
      title="Paste share URL from clipboard"
      style="background: #262626; border: 1px solid #404040; border-radius: 4px; padding: 3px 8px; color: #d4d4d4; cursor: pointer; font-size: 13px; flex-shrink: 0; font-family: inherit;"
      onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = "#333333")}
      onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = "#262626")}
    >
      📋
    </button>
    <button
      onclick={handleConnect}
      disabled={!input.trim() || peerState.status === "connecting"}
      style="background: {input.trim()
        ? 'rgba(56,189,248,0.15)'
        : '#1a1a1a'}; border: 1px solid {input.trim()
        ? 'rgba(56,189,248,0.5)'
        : '#333333'}; border-radius: 4px; padding: 3px 10px; color: {input.trim()
        ? '#7dd3fc'
        : '#525252'}; cursor: {input.trim() ? 'pointer' : 'not-allowed'}; font-size: 12px; font-weight: 600; flex-shrink: 0; white-space: nowrap; font-family: inherit;"
    >
      {peerState.status === "connecting" ? "…" : "Connect"}
    </button>
  {/if}
</div>

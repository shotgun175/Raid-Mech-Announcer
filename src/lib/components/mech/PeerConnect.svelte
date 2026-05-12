<script lang="ts">
  import { readText } from "@tauri-apps/plugin-clipboard-manager";
  import { peerState } from "$lib/mech-peer.svelte";
  import { mechStore } from "$lib/mech-store.svelte";

  const SHARE_URL_PREFIX = "https://live.lostark.bible/";

  let input = $state("");
  let pasteAttempted = $state(false);
  let pasteError = $state<string | null>(null);
  let showDebug = $state(false);
  let logEl = $state<HTMLElement | null>(null);

  $effect(() => {
    peerState.debugLog;
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  });

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
    pasteAttempted = true;
    pasteError = null;
    let text = "";
    try {
      text = (await readText())?.trim() ?? "";
    } catch {
      try {
        text = (await navigator.clipboard.readText()).trim();
      } catch {
        text = "";
      }
    }
    if (!text) {
      input = "";
      return;
    }
    if (!text.startsWith(SHARE_URL_PREFIX)) {
      input = "";
      pasteError = "Not a share URL";
      return;
    }
    input = text;
  }

  function handleConnect() {
    if (input.trim()) peerState.connect(input.trim());
  }
</script>

{#if showDebug}
  <div
    bind:this={logEl}
    style="border-top: 1px solid #262626; background: #0a0a0a; padding: 6px 10px; max-height: 220px; overflow-y: auto; flex-shrink: 0;"
  >
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
      <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #525252; text-transform: uppercase;"
        >PeerJS Event Log</span
      >
      <button
        onclick={() => peerState.clearDebugLog()}
        style="font-size: 10px; color: #525252; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit;"
        >clear</button
      >
    </div>
    {#if peerState.debugLog.length === 0}
      <span style="font-size: 11px; color: #333333; font-family: ui-monospace, monospace;">no events yet</span>
    {:else}
      {#each peerState.debugLog as entry, i (i)}
        {@const isLatest = i === peerState.debugLog.length - 1}
        <div
          style="font-size: 11px; color: {isLatest
            ? '#a3a3a3'
            : '#404040'}; font-family: ui-monospace, monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.6;"
        >
          {entry}
        </div>
      {/each}
    {/if}
  </div>
{/if}

<div
  style="border-top: 1px solid #404040; padding: 6px 14px; flex-shrink: 0; background: #111111; display: flex; align-items: center; gap: 8px; min-height: 36px;"
>
  <!-- debug toggle -->
  <button
    onclick={() => (showDebug = !showDebug)}
    title="Toggle event log"
    style="font-size: 10px; color: {showDebug
      ? '#38bdf8'
      : '#404040'}; background: none; border: none; cursor: pointer; padding: 0; flex-shrink: 0; font-family: ui-monospace, monospace; line-height: 1;"
    >⬡</button
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
    {#if pasteAttempted}
      {@const previewLabel = input || pasteError || "Nothing on clipboard"}
      <span
        style="font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 1; color: {input
          ? '#64748b'
          : '#f87171'};"
        title={previewLabel}
      >
        {previewLabel}
      </span>
    {/if}
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
      style="background: {input.trim() ? 'rgba(56,189,248,0.15)' : '#1a1a1a'}; border: 1px solid {input.trim()
        ? 'rgba(56,189,248,0.5)'
        : '#333333'}; border-radius: 4px; padding: 3px 10px; color: {input.trim()
        ? '#7dd3fc'
        : '#8a8a8a'}; cursor: {input.trim()
        ? 'pointer'
        : 'not-allowed'}; font-size: 12px; font-weight: 600; flex-shrink: 0; white-space: nowrap; font-family: inherit;"
    >
      {peerState.status === "connecting" ? "…" : "Connect"}
    </button>
  {/if}
</div>

<script lang="ts">
  import { peerState } from "$lib/mech-peer.svelte";
  import { mechStore } from "$lib/mech-store.svelte";

  let input = $state("");
  let pasting = $state(false);

  const statusColor = $derived(
    peerState.status === "connected" ? "#4ade80"
    : peerState.status === "connecting" ? "#fbbf24"
    : peerState.status === "error" ? "#f87171"
    : "#525252"
  );

  const statusLabel = $derived(
    peerState.status === "connected"
      ? `Live · ${mechStore.liveBossName ?? "connected"}`
      : peerState.status === "connecting" ? "Connecting…"
      : peerState.status === "error" ? (peerState.errorMsg ?? "Error")
      : "Not connected"
  );

  async function pasteFromClipboard() {
    try {
      pasting = true;
      const text = await navigator.clipboard.readText();
      input = text.trim();
    } catch {
      // clipboard access denied — user must paste manually
    } finally {
      pasting = false;
    }
  }

  function handleConnect() {
    if (input.trim()) peerState.connect(input.trim());
  }
</script>

<div style="border-top: 1px solid #262626; padding: 10px 14px; flex-shrink: 0;">
  <!-- Status row -->
  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
    <div style="width: 7px; height: 7px; border-radius: 50%; background: {statusColor}; box-shadow: 0 0 6px {statusColor}; {peerState.status === 'connected' ? 'animation: mech-pulse 2s ease-in-out infinite;' : ''}"></div>
    <span style="font-size: 10.5px; color: {peerState.status === 'error' ? '#f87171' : '#a3a3a3'}; font-weight: {peerState.status === 'connected' ? 600 : 400}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">{statusLabel}</span>
    {#if peerState.isConnected}
      <button
        onclick={() => peerState.disconnect()}
        style="font-size: 10px; color: #525252; background: transparent; border: none; cursor: pointer; padding: 2px 4px; border-radius: 3px;"
        onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
        onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = '#525252')}
      >✕ disconnect</button>
    {/if}
  </div>

  {#if !peerState.isConnected}
    <div style="display: flex; gap: 4px;">
      <input
        bind:value={input}
        placeholder="Paste LOA Logs share URL…"
        onkeydown={(e) => e.key === "Enter" && handleConnect()}
        style="flex: 1; background: #0a0a0a; border: 1px solid #262626; border-radius: 4px; padding: 5px 8px; color: #fafafa; font-size: 11px; outline: none; min-width: 0;"
      />
      <button
        onclick={pasteFromClipboard}
        title="Paste from clipboard"
        style="background: #262626; border: 1px solid #262626; border-radius: 4px; padding: 5px 8px; color: #a3a3a3; cursor: pointer; font-size: 11px; white-space: nowrap;"
      >{pasting ? "…" : "📋"}</button>
      <button
        onclick={handleConnect}
        disabled={!input.trim() || peerState.status === "connecting"}
        style="background: {input.trim() ? 'rgba(56,189,248,0.1)' : '#1a1a1a'}; border: 1px solid {input.trim() ? 'rgba(56,189,248,0.3)' : '#262626'}; border-radius: 4px; padding: 5px 10px; color: {input.trim() ? '#38bdf8' : '#525252'}; cursor: {input.trim() ? 'pointer' : 'not-allowed'}; font-size: 11px; font-weight: 600; white-space: nowrap;"
      >{peerState.status === "connecting" ? "…" : "Connect"}</button>
    </div>
    <div style="font-size: 9.5px; color: #525252; margin-top: 5px; line-height: 1.4;">
      In LOA Logs: enable Experimental Features → click screenshare icon → paste the copied URL here
    </div>
  {/if}
</div>

<style>
  @keyframes mech-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.4); }
  }
</style>

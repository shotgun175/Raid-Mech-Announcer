<script lang="ts">
  import { readText } from "@tauri-apps/plugin-clipboard-manager";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { onMount, onDestroy } from "svelte";
  import { peerState } from "$lib/mech-peer.svelte";
  import { mechStore } from "$lib/mech-store.svelte";

  interface FightEndEvent {
    boss: string;
    difficulty: string;
    cleared: boolean;
  }

  let input = $state("");
  let lastFight = $state<FightEndEvent | null>(null);
  let unlistenFight: UnlistenFn | null = null;

  onMount(async () => {
    unlistenFight = await listen<FightEndEvent>("loa:fight-end", (e) => {
      lastFight = e.payload;
    });
  });

  onDestroy(() => {
    unlistenFight?.();
  });

  async function readClipboard(): Promise<string> {
    try {
      return await readText();
    } catch {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return "";
      }
    }
  }

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

  async function pasteFromClipboard() {
    const text = await readClipboard();
    if (text) input = text.trim();
  }

  function handleConnect() {
    if (input.trim()) peerState.connect(input.trim());
  }
</script>

<div style="border-top: 1px solid #404040; padding: 12px 14px; flex-shrink: 0; background: #111111;">
  <!-- Section label -->
  <div
    style="font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #737373; margin-bottom: 8px;"
  >
    LOA Logs Connection
  </div>

  <!-- Status row -->
  <div
    style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 7px 10px; border-radius: 6px; background: #1a1a1a; border: 1px solid #333333;"
  >
    <div
      style="width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: {statusColor}; box-shadow: 0 0 8px {statusColor}; animation: mech-pulse 2s ease-in-out infinite;"
    ></div>
    <span
      style="font-size: 12px; color: {peerState.status === 'error'
        ? '#fca5a5'
        : peerState.status === 'connected'
          ? '#86efac'
          : '#d4d4d4'}; font-weight: {peerState.status === 'connected'
        ? 600
        : 400}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">{statusLabel}</span
    >
    {#if peerState.isConnected}
      <button
        onclick={() => peerState.disconnect()}
        style="font-size: 11px; font-weight: 600; color: #f87171; background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); cursor: pointer; padding: 3px 8px; border-radius: 4px; white-space: nowrap; transition: background 0.15s;"
        onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.2)")}
        onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)")}
        >Disconnect</button
      >
    {/if}
  </div>

  {#if lastFight}
    <div
      style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px; padding: 6px 10px; border-radius: 6px; background: #1a1a1a; border: 1px solid #333333; font-size: 11px;"
    >
      <span style="color: #737373; flex-shrink: 0;">Last fight:</span>
      <span
        style="color: #d4d4d4; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;"
        >{lastFight.difficulty} · {lastFight.boss}</span
      >
      {#if lastFight.cleared}
        <span style="color: #4ade80; font-weight: 700; flex-shrink: 0;">Clear</span>
      {:else}
        <span style="color: #f87171; font-weight: 700; flex-shrink: 0;">Wipe</span>
      {/if}
    </div>
  {/if}

  {#if !peerState.isConnected}
    <!-- Manual input fallback -->
    <div style="display: flex; gap: 6px;">
      <input
        bind:value={input}
        placeholder="Manual: paste LOA Logs share URL"
        onkeydown={(e) => e.key === "Enter" && handleConnect()}
        style="flex: 1; background: #0f0f0f; border: 1px solid #333333; border-radius: 5px; padding: 7px 10px; color: #fafafa; font-size: 12px; outline: none; min-width: 0;"
      />
      <button
        onclick={pasteFromClipboard}
        title="Paste from clipboard"
        style="background: #262626; border: 1px solid #404040; border-radius: 5px; padding: 7px 10px; color: #d4d4d4; cursor: pointer; font-size: 13px; white-space: nowrap; transition: background 0.15s;"
        onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = "#333333")}
        onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = "#262626")}>📋</button
      >
      <button
        onclick={handleConnect}
        disabled={!input.trim() || peerState.status === "connecting"}
        style="background: {input.trim() ? 'rgba(56,189,248,0.15)' : '#1a1a1a'}; border: 1px solid {input.trim()
          ? 'rgba(56,189,248,0.5)'
          : '#333333'}; border-radius: 5px; padding: 7px 12px; color: {input.trim()
          ? '#7dd3fc'
          : '#525252'}; cursor: {input.trim()
          ? 'pointer'
          : 'not-allowed'}; font-size: 12px; font-weight: 700; white-space: nowrap; font-family: inherit;"
        >{peerState.status === "connecting" ? "…" : "Connect"}</button
      >
    </div>
  {/if}
</div>

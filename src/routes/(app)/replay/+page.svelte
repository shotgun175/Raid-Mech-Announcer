<script lang="ts">
  import { captureReadAll, captureClear } from "$lib/api";
  import { parseCapture, segmentFights, type Fight } from "$lib/utils/capture";
  import { replayFight, type ReplayHandle, type ReplayMode } from "$lib/utils/replay";
  import { mechStore } from "$lib/mech-store.svelte";
  import { onMount } from "svelte";
  import Header from "../Header.svelte";

  // Dev-only diagnostic tool: re-runs captured fights back through the live pipeline.
  const isDev = import.meta.env.DEV;

  let fights = $state<Fight[]>([]);
  let replayHandle: ReplayHandle | null = null;
  let replayingId = $state<string | null>(null);

  // Click-to-confirm guard for "Clear all", mirroring MechRow's delete pill: first click
  // arms it for 3s, a second click within the window actually clears.
  let pendingClear = $state(false);
  let pendingClearTimer: ReturnType<typeof setTimeout> | null = null;
  const CLEAR_CONFIRM_MS = 3000;

  async function loadFights() {
    try {
      fights = segmentFights(parseCapture(await captureReadAll())).reverse(); // newest first
    } catch {
      fights = [];
    }
  }

  function startReplay(fight: Fight, mode: ReplayMode) {
    replayHandle?.stop();
    // Tear down any prior run first so its pending silence tiers (8s/20s/60s) can't bleed into
    // this one. A lone replay still plays its tiers out; only starting another (or Stop) cancels them.
    mechStore.endEncounter();
    replayingId = fight.id;
    replayHandle = replayFight(fight.records, mode, 1, () => {
      if (replayingId === fight.id) replayingId = null;
    });
  }

  // Stop is a hard reset: cancel the feed, then tear the encounter down so the overlay
  // clears immediately instead of lingering on the last replayed HP until the silence net.
  function stopReplay() {
    replayHandle?.stop();
    replayHandle = null;
    replayingId = null;
    mechStore.endEncounter();
  }

  async function clearCaptures() {
    await captureClear().catch(() => {});
    await loadFights();
  }

  function requestClear() {
    if (pendingClear) {
      if (pendingClearTimer) clearTimeout(pendingClearTimer);
      pendingClearTimer = null;
      pendingClear = false;
      clearCaptures();
      return;
    }
    if (pendingClearTimer) clearTimeout(pendingClearTimer);
    pendingClear = true;
    pendingClearTimer = setTimeout(() => {
      pendingClear = false;
      pendingClearTimer = null;
    }, CLEAR_CONFIRM_MS);
  }

  onMount(loadFights);
</script>

<Header title="Replay" />

{#if !isDev}
  <div class="mx-auto max-w-[180rem] px-8 py-4 text-sm text-neutral-400">Replay is a development-only tool.</div>
{:else}
  <div class="mx-auto flex max-w-[180rem] flex-col gap-3 px-8 py-4">
    <div class="flex items-center gap-2">
      <button onclick={loadFights} class="rounded-md bg-neutral-700 px-3 py-1.5 text-sm transition hover:bg-neutral-600"
        >Refresh</button
      >
      {#if pendingClear}
        <button
          onclick={requestClear}
          title="Click again to confirm"
          class="animate-[mech-pulse_1.2s_ease-in-out_infinite] rounded-md border border-red-400/40 bg-red-400/15 px-3 py-1.5 text-xs font-bold tracking-wide text-red-400"
          >Confirm?</button
        >
      {:else}
        <button onclick={requestClear} class="px-2 py-1.5 text-xs text-neutral-500 transition hover:text-red-400"
          >Clear all</button
        >
      {/if}
    </div>
    {#if fights.length === 0}
      <div class="text-xs text-neutral-500">No captures yet. Connect to a fight, then Refresh.</div>
    {/if}
    {#each fights as f (f.id)}
      <div class="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2">
        <div class="flex flex-col">
          <span class="text-sm font-medium">{f.boss}</span>
          <span class="text-xs text-neutral-500"
            >{new Date(f.startedAt).toLocaleString()} · {Math.round((f.endedAt - f.startedAt) / 1000)}s · {f.outcome} · {f
              .records.length} events</span
          >
        </div>
        <div class="flex gap-2">
          {#if replayingId === f.id}
            <button
              onclick={stopReplay}
              class="rounded-md bg-red-500/30 px-3 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/40"
              >Stop</button
            >
          {:else}
            <button
              onclick={() => startReplay(f, "instant")}
              class="rounded-md bg-accent-600/30 px-3 py-1 text-xs font-medium text-accent-400 transition hover:bg-accent-600/40"
              >Instant</button
            >
            <button
              onclick={() => startReplay(f, "realtime")}
              class="rounded-md bg-accent-600/30 px-3 py-1 text-xs font-medium text-accent-400 transition hover:bg-accent-600/40"
              >Real-time</button
            >
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

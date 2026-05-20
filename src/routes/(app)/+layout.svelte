<script lang="ts">
  import { goto } from "$app/navigation";
  import UpdateAvailable from "$lib/components/UpdateAvailable.svelte";
  import Toaster from "$lib/components/Toaster.svelte";
  import PeerConnect from "$lib/components/mech/PeerConnect.svelte";
  import { getSettings } from "$lib/api";
  import { emit, listen } from "@tauri-apps/api/event";
  import { settings } from "$lib/stores.svelte";
  import { peerState } from "$lib/mech-peer.svelte";
  import { mechStore } from "$lib/mech-store.svelte";
  import { checkForUpdate } from "$lib/utils/updater";
  import { registerShortcuts } from "$lib/utils/shortcuts";
  import { getVersion } from "@tauri-apps/api/app";
  import { readText } from "@tauri-apps/plugin-clipboard-manager";
  import { onMount } from "svelte";

  let { children }: { children?: import("svelte").Snippet } = $props();

  const scaleMap = [0.95, 1.0, 1.05, 1.1];
  const logScale = $derived(scaleMap[Number(settings.app.general.logScale ?? 1)] ?? 1.0);

  const LOA_LIVE_PREFIX = "https://live.lostark.bible/";
  let lastSeenClip = "";

  onMount(() => {
    (async () => {
      const data = await getSettings();
      if (data) settings.app = data;

      const version = await getVersion();
      if (settings.version !== version) settings.version = version;

      await registerShortcuts();

      checkForUpdate();

      try {
        await emit("mech:overlay-preview");
      } catch {}

      goto("/raid-editor");
    })();

    // Pipe TTS debug events from other windows (overlay) into the PeerJS debug strip
    const unlistenTts = listen<string>("tts:debug", (event) => {
      if (typeof event.payload === "string") peerState.pushDebugLog(event.payload);
    });

    // LOA Logs writes a "saving to db" line on true encounter end (not phase transitions).
    // endEncounter() clears the sticky gate and broadcasts mech:encounter-end itself,
    // so the back-to-back fight re-matches against the new boss.
    const unlistenFightEnd = listen("loa:fight-end", () => {
      mechStore.endEncounter();
    });

    const pollId = setInterval(async () => {
      if (peerState.status === "connecting" || peerState.isConnected) return;
      try {
        const text = await readText();
        if (!text || text === lastSeenClip || !text.trim().startsWith(LOA_LIVE_PREFIX)) return;
        lastSeenClip = text;
        peerState.connect(text.trim());
      } catch {}
    }, 1000);

    return () => {
      clearInterval(pollId);
      unlistenTts.then((fn) => fn()).catch(() => {});
      unlistenFightEnd.then((fn) => fn()).catch(() => {});
    };
  });
</script>

<UpdateAvailable />
<Toaster />
<div class="flex h-screen flex-col bg-neutral-900 select-none" style="zoom: {logScale};">
  <div class="min-h-0 flex-1 overflow-auto">
    {@render children?.()}
  </div>
  <PeerConnect />
</div>

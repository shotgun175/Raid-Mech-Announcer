<script lang="ts">
  import { goto } from "$app/navigation";
  import UpdateAvailable from "$lib/components/UpdateAvailable.svelte";
  import Toaster from "$lib/components/Toaster.svelte";
  import { getSettings } from "$lib/api";
  import { emit } from "@tauri-apps/api/event";
  import { settings } from "$lib/stores.svelte";
  import { peerState } from "$lib/mech-peer.svelte";
  import { registerShortcuts } from "$lib/utils/shortcuts";
  import { getVersion } from "@tauri-apps/api/app";
  import { readText } from "@tauri-apps/plugin-clipboard-manager";
  import { onMount } from "svelte";

  let { children }: { children?: import("svelte").Snippet } = $props();

  const LOA_LIVE_PREFIX = "https://live.lostark.bible/";
  let lastSeenClip = "";

  onMount(() => {
    (async () => {
      const data = await getSettings();
      if (data) settings.app = data;

      const version = await getVersion();
      if (settings.version !== version) settings.version = version;

      // Register shortcuts immediately so they work without visiting settings first
      await registerShortcuts();

      try {
        await emit("mech:overlay-preview");
      } catch {}

      goto("/mech-editor");
    })();

    // Global clipboard polling — watches for LOA Logs share URLs regardless of active page
    const pollId = setInterval(async () => {
      if (peerState.status === "connecting" || peerState.isConnected) return;
      try {
        const text = await readText();
        if (!text || text === lastSeenClip || !text.trim().startsWith(LOA_LIVE_PREFIX)) return;
        lastSeenClip = text;
        peerState.connect(text.trim());
      } catch {}
    }, 1000);

    return () => clearInterval(pollId);
  });
</script>

<UpdateAvailable />
<Toaster />
<div class="min-h-screen bg-neutral-900 select-none">
  {@render children?.()}
</div>

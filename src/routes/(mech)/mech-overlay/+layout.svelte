<script lang="ts">
  import { settings } from "$lib/stores.svelte";
  import { getSettings } from "$lib/api";
  import { listen } from "@tauri-apps/api/event";
  import { onDestroy, onMount } from "svelte";

  let { children }: { children?: import("svelte").Snippet } = $props();

  let unlisten: (() => void) | null = null;

  // Load settings from Rust so scale/clickThrough reflect persisted values
  onMount(async () => {
    try {
      const data = await getSettings();
      if (data) settings.app = data;
    } catch {}

    // Reload settings whenever the app window signals a change
    unlisten = await listen("mech:settings-reload", async () => {
      try {
        const data = await getSettings();
        if (data) settings.app = data;
      } catch {}
    });
  });

  onDestroy(() => {
    unlisten?.();
  });

  // Scale map: 0=Small(0.8×) 1=Normal(1×) 2=Large(1.2×) 3=Largest(1.4×)
  const scaleMap = [0.8, 1.0, 1.2, 1.4];
  const scale = $derived(scaleMap[settings.app.general.scale ?? 1] ?? 1.0);
</script>

<svelte:head>
  <style>
    html,
    body {
      overflow: hidden !important;
      margin: 0;
      padding: 0;
    }
  </style>
</svelte:head>

<div class="h-screen w-screen overflow-hidden bg-transparent select-none" style="font-size: {scale}rem; zoom: {scale};">
  {@render children?.()}
</div>

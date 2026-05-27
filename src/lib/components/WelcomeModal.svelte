<script lang="ts" module>
  // Shared trigger so Settings (or anywhere) can re-open the welcome modal,
  // mirroring the addToast export pattern on Toaster.svelte.
  let openRequested = $state(false);
  export function openWelcome() {
    openRequested = true;
  }
</script>

<script lang="ts">
  import { settings } from "$lib/stores.svelte";
  import { createDialog, melt } from "@melt-ui/svelte";
  import { fade } from "svelte/transition";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";

  const WELCOME_KEY = "rma-welcome-dismissed";

  const {
    elements: { portalled, overlay, content, title, description, close },
    states: { open }
  } = createDialog({ forceVisible: true });

  onMount(() => {
    if (browser && !localStorage.getItem(WELCOME_KEY)) {
      $open = true;
    }
  });

  // Settings "Show welcome guide" button calls openWelcome(); re-open on demand.
  $effect(() => {
    if (openRequested) {
      $open = true;
      openRequested = false;
    }
  });

  function dismiss() {
    if (browser) localStorage.setItem(WELCOME_KEY, "true");
    $open = false;
  }
</script>

{#if $open}
  <div use:melt={$portalled}>
    <div use:melt={$overlay} class="fixed inset-0 z-50 bg-black/50" transition:fade={{ duration: 150 }}></div>
    <div
      class="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[36rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-neutral-800/40 p-6 shadow-lg drop-shadow-xl backdrop-blur-xl
      {settings.app.general.accentColor} flex flex-col gap-4 text-white"
      use:melt={$content}
    >
      <h2 use:melt={$title} class="text-xl font-semibold">Welcome to Raid Mech Announcer</h2>
      <div use:melt={$description} class="flex flex-col gap-3 text-sm text-neutral-300">
        <p>Before your first raid, a few things to know:</p>
        <ul class="flex flex-col gap-2">
          <li>
            <span class="font-medium text-white">Antivirus may quarantine the app.</span> It ships a packet-capture driver
            (WinDivert) that antivirus often flags. If detection isn't working, add this app's folder to your AV exceptions
            and relaunch.
          </li>
          <li>
            <span class="font-medium text-white">LOA Logs must be installed and running.</span> This app reads LOA Logs' raid
            data to drive announcements. It won't start without LOA Logs' meter-data present.
          </li>
          <li>
            <span class="font-medium text-white">NordVPN can't run at the same time.</span> Both use the same capture driver.
            Quit NordVPN fully (and reboot) if detection fails.
          </li>
          <li>
            <span class="font-medium text-white">Run as Administrator</span> if the overlay never reacts to a fight - packet
            capture needs elevated rights.
          </li>
        </ul>
      </div>
      <div class="flex justify-end">
        <button
          use:melt={$close}
          class="rounded-md bg-accent-500/70 px-4 py-1.5 text-sm hover:bg-accent-500/60 focus:ring-0"
          onclick={dismiss}
        >
          Got it
        </button>
      </div>
    </div>
  </div>
{/if}

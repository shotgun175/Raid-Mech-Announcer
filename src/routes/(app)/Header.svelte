<script lang="ts">
  import { page } from "$app/state";
  import QuickTooltip from "$lib/components/QuickTooltip.svelte";
  import { addToast } from "$lib/components/Toaster.svelte";
  import { IconArrowUp, IconDiscord, IconExternalLink, IconMenu, IconRefresh, IconX } from "$lib/icons";
  import { settings, updateInfo } from "$lib/stores.svelte";
  import { checkForUpdate } from "$lib/utils";
  import { noUpdateAvailable } from "$lib/utils/toasts";
  import { createDialog, melt } from "@melt-ui/svelte";
  import { getVersion } from "@tauri-apps/api/app";
  import { onMount, type Snippet } from "svelte";
  import { fade, fly } from "svelte/transition";

  const { title, children }: { title: string; children?: Snippet } = $props();

  let pathname = $derived(page.url.pathname);

  const {
    elements: { trigger, overlay, content, close, portalled },
    states: { open }
  } = createDialog({
    forceVisible: true
  });

  let version = $state("");

  onMount(() => {
    (async () => {
      version = await getVersion();
    })();
  });

  let checking = $state(false);
</script>

<div
  class="sticky top-0 z-20 h-16 bg-neutral-900/70 px-8 py-5 shadow-sm shadow-neutral-800 drop-shadow-lg backdrop-blur-lg"
>
  <div class="mx-auto flex max-w-[180rem] items-center justify-between">
    <div class="flex items-center gap-4">
      <button use:melt={$trigger}>
        <IconMenu class="size-7 hover:opacity-60" />
      </button>
      <div class="text-xl font-medium">{title}</div>
    </div>
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

{#snippet route(name: string, path: string)}
  <a
    href={path}
    class="rounded-md px-3 py-1 text-base hover:text-accent-500"
    class:bg-neutral-800={pathname.startsWith(path)}
  >
    {name}
  </a>
{/snippet}

{#if $open}
  <div use:melt={$portalled} class="text-white select-none {settings.app.general.accentColor}">
    <div use:melt={$overlay} class="fixed inset-0 z-30 bg-neutral-950/50" transition:fade={{ duration: 100 }}></div>
    <div
      use:melt={$content}
      class="fixed top-0 left-0 z-30 flex h-screen min-w-[15rem] flex-col bg-neutral-900 shadow-md"
      transition:fly={{ x: -240, duration: 100 }}
    >
      <div class="m-4 flex items-center">
        <p class="text-xl font-semibold">Raid Mech Announcer</p>
        <button use:melt={$close} class="ml-auto px-3 hover:opacity-60">
          <IconX class="size-7" />
        </button>
      </div>
      <div class="mx-4 mb-2 h-px bg-accent-500/20"></div>
      <div class="grid gap-1 px-2">
        {@render route("Changelog", "/changelog")}
        <div class="mx-4 my-2 h-px bg-accent-500/20"></div>
        {@render route("Raid Editor", "/mech-editor")}
        {@render route("Settings", "/mech-settings")}
      </div>
      <div class="m-2 h-px bg-accent-500/20"></div>

      <div class="flex gap-1 px-2">
        <!-- TODO: add your own donation link -->
        <!-- <a href="" target="_blank" class="hover:text-accent-500 flex items-center gap-2 rounded-md px-3 py-1">
          <div>Donate</div>
          <IconExternalLink class="size-4" />
        </a> -->
      </div>
      <div class="flex items-center gap-1 px-2">
        <!-- TODO: add your own Discord invite link -->
        <!-- <a href="" target="_blank" class="hover:text-accent-500 flex items-center gap-2 rounded-md px-3 py-1">
          <div>Discord</div>
          <IconDiscord class="size-4" />
        </a> -->
      </div>
      <!-- version + update button row -->
      <div class="mx-4 mt-auto mb-2 flex items-center justify-between px-1">
        {#if version}
          <span class="text-sm text-neutral-500">version {version}</span>
        {/if}
        {#if !updateInfo.available}
          <button
            class="group ml-auto"
            onclick={async () => {
              checking = true;
              const update = await checkForUpdate(settings.app.general.betaChannel);
              setTimeout(() => {
                if (!update) {
                  addToast(noUpdateAvailable);
                }
                checking = false;
              }, 900);
            }}
          >
            <QuickTooltip tooltip="Check for updates">
              <IconRefresh
                class="size-4 transform group-hover:text-accent-500/80 {checking
                  ? 'animate-[spin_1s_linear_infinite_reverse]'
                  : ''}"
              />
            </QuickTooltip>
          </button>
        {:else}
          <button
            class="group ml-auto"
            onclick={async () => {
              updateInfo.available = false;
              updateInfo.available = true;
            }}
          >
            <QuickTooltip tooltip="Update available">
              <IconArrowUp class="size-4 animate-bounce text-accent-500/80 group-hover:text-accent-500/70" />
            </QuickTooltip>
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

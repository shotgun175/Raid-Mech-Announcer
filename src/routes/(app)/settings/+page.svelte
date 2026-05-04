<script lang="ts">
  import {
    checkStartOnBoot,
    installStableUpdate,
    relaunchApp,
    setAlwaysOnTop,
    setBlur,
    setBossOnlyDamage,
    setStartOnBoot
  } from "$lib/api";
  import { addToast } from "$lib/components/Toaster.svelte";
  import { settings } from "$lib/stores.svelte";
  import { checkForUpdate } from "$lib/utils";
  import { networkSettingsChanged } from "$lib/utils/toasts";
  import { createDialog, melt } from "@melt-ui/svelte";
  import { getVersion } from "@tauri-apps/api/app";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import Header from "../Header.svelte";
  import Shortcuts from "./Shortcuts.svelte";

  let currentTab = $state("General");

  let prevBetaChannel = $state(settings.app.general.betaChannel);
  $effect(() => {
    let isBeta = settings.app.general.betaChannel;
    if (isBeta !== prevBetaChannel) {
      prevBetaChannel = isBeta;
      checkForUpdate(isBeta);
    }
  });

  const {
    elements: {
      portalled: optOutPortalled,
      overlay: optOutOverlay,
      content: optOutContent,
      title: optOutTitle,
      description: optOutDescription
    },
    states: { open: optOutOpen }
  } = createDialog();

  let installingStable = $state(false);

  const {
    elements: {
      portalled: optInPortalled,
      overlay: optInOverlay,
      content: optInContent,
      title: optInTitle,
      description: optInDescription
    },
    states: { open: optInOpen }
  } = createDialog();

  onMount(() => {
    (async () => {
      settings.app.general.startOnBoot = await checkStartOnBoot();
    })();
  });

  const themes = [
    { name: "theme-red", color: "--color-red-500" },
    { name: "theme-pink", color: "--color-pink-500" },
    { name: "theme-rose", color: "oklch(69.9% 0.123 356.37)" },
    { name: "theme-violet", color: "oklch(72.3% 0.15 293.69)" },
    { name: "theme-purple", color: "--color-purple-500" },
    { name: "theme-blue", color: "--color-blue-500" },
    { name: "theme-green", color: "--color-green-500" },
    { name: "theme-yellow", color: "--color-yellow-500" },
    { name: "theme-orange", color: "--color-orange-500" }
  ];

  let before = $state(settings.app.general.autoIface);
  let beforePort = $state(settings.app.general.port);
  let networkChanged = $derived(before !== settings.app.general.autoIface || beforePort !== settings.app.general.port);
  let networkNotification = $state(false);

  $effect(() => {
    if (networkChanged) {
      if (!networkNotification) {
        addToast(networkSettingsChanged);
        setTimeout(() => {
          networkNotification = false;
        }, 20000);
      }
    }
  });
</script>

{#snippet settingsTab(tabName: string)}
  <button
    class="rounded-sm px-2 py-1 text-sm text-nowrap text-white transition focus:outline-hidden {tabName === currentTab
      ? 'border-transparent bg-accent-600/80'
      : 'bg-transparent hover:bg-neutral-700/60'}"
    onclick={() => {
      currentTab = tabName;
    }}
  >
    {tabName}
  </button>
{/snippet}
{#snippet settingOption(category: string, setting: string, name: string, description?: string, breakdown?: boolean)}
  {@const appSettings = settings.app as any}
  <div class="w-fit">
    <label class="flex items-center gap-2">
      {#if !breakdown}
        <input
          type="checkbox"
          bind:checked={appSettings[category][setting]}
          class="form-checkbox size-5 rounded-sm border-0 bg-neutral-700 checked:text-accent-600/80 focus:ring-0"
        />
      {:else}
        <input
          type="checkbox"
          bind:checked={appSettings[category]["breakdown"][setting]}
          class="form-checkbox size-5 rounded-sm border-0 bg-neutral-700 checked:text-accent-600/80 focus:ring-0"
        />
      {/if}
      <div class="ml-5">
        <div class="text-sm">{name}</div>
        {#if description}
          <div class="text-xs text-neutral-300">{description}</div>
        {/if}
      </div>
    </label>
  </div>
{/snippet}
{#snippet scaleOption(tab: string)}
  <div class="flex items-center gap-2 py-1">
    <div>
      <select
        id="modifiers"
        bind:value={settings.app.general[tab === "meter" ? "scale" : "logScale"]}
        class="w-28 rounded-lg bg-neutral-700 py-1 text-sm placeholder-neutral-400 focus:border-accent-500 focus:ring-accent-500"
      >
        <option value="0">Small</option>
        <option value="1">Normal</option>
        <option value="2">Large</option>
        <option value="3">Largest</option>
      </select>
    </div>
    <div>{tab === "meter" ? "Meter" : "Logs"} UI Scale</div>
  </div>
{/snippet}
{#snippet themeSetting()}
  <div class="flex flex-col gap-2 py-2">
    <div class="text-sm">Color Theme</div>
    <div class="flex items-center gap-2">
      {#each themes as theme}
        {@render themePreview(theme.name, theme.color)}
      {/each}
    </div>
  </div>
{/snippet}
{#snippet themePreview(theme: string, color: string)}
  <button
    class="size-8 rounded-full opacity-90 hover:opacity-100 {theme === settings.app.general.accentColor
      ? 'border-2 border-white'
      : ''}"
    style="background-color: var({color}); background-color: {color}"
    aria-label={theme}
    onclick={() => {
      settings.app.general.accentColor = theme;
    }}
  ></button>
{/snippet}

<Header title="Settings" />
<div class="mx-auto max-w-[180rem] px-8 py-4">
  <div class="flex flex-col gap-2">
    <div class="flex gap-2 overflow-x-auto px-2 max-md:max-w-[100vw]">
      {@render settingsTab("General")}
      {@render settingsTab("Accessibility")}
      {@render settingsTab("Shortcuts")}
    </div>
    <div class="flex flex-col gap-2 px-4 py-2">
      {#if currentTab === "General"}
        {@render themeSetting()}
        {@render settingOption(
          "general",
          "autoShow",
          "Auto Show/Hide",
          "Automatically show and hide meter window when encounter starts and ends."
        )}
        {#if settings.app.general.autoShow}
          <div class="flex items-center">
            <input
              type="number"
              class="form-input h-8 w-12 rounded-md border-0 bg-neutral-700 text-sm focus:ring-0"
              bind:value={settings.app.general.autoHideDelay}
              placeholder={settings.app.general.autoHideDelay.toString()}
            />
            <div class="ml-5">
              <div>Hide Delay</div>
              <div class="text-xs text-neutral-300">
                Set a delay in seconds before the meter hides after an encounter ends.
              </div>
            </div>
          </div>
        {/if}
        {@render settingOption(
          "general",
          "startLoaOnStart",
          "Auto Launch Lost Ark",
          "Automatically start Lost Ark when the app is opened."
        )}
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            bind:checked={settings.app.general.startOnBoot}
            onchange={async () => {
              await setStartOnBoot(settings.app.general.startOnBoot);
            }}
            class="form-checkbox size-5 rounded-sm border-0 bg-neutral-700 checked:text-accent-600 focus:ring-0"
          />
          <div class="ml-5">
            <div class="text-sm">Start with Windows</div>
            <div class="text-xs text-neutral-300">Automatically start the app when Windows boots up.</div>
          </div>
        </label>
        {@render settingOption(
          "general",
          "lowPerformanceMode",
          "Low Performance Mode",
          "Lowers meter update frequency to reduce CPU usage. (Requires Restart)"
        )}
        {@render settingOption(
          "general",
          "showNames",
          "Show Player Names",
          "Show player names if it's loaded. If disabled, it will show the class name (e.g. Arcanist)."
        )}
        {@render settingOption(
          "general",
          "showGearScore",
          "Show Gear Score",
          "Show player's item level if it's loaded."
        )}
        {@render settingOption(
          "general",
          "hideNames",
          "Hide Names",
          "Hides player names completely, will not show class name either."
        )}
        {@render settingOption(
          "general",
          "showEsther",
          "Show Esther",
          "Show damage dealt by Esther skills in meter and log view"
        )}
        {@render settingOption(
          "general",
          "hideLogo",
          "Hide Logo in Screenshot",
          'Hides the meter name "LOA Logs" in the screenshot.'
        )}
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            bind:checked={settings.app.general.bossOnlyDamage}
            onchange={() => {
              setBossOnlyDamage(settings.app.general.bossOnlyDamage);
            }}
            class="form-checkbox size-5 rounded-sm border-0 bg-neutral-700 checked:text-accent-600/80 focus:ring-0"
          />
          <div class="ml-5">
            <div class="text-sm">Boss Only Damage</div>
            <div class="text-xs text-neutral-300">Only track damage dealt to bosses.</div>
          </div>
        </label>
        {@render settingOption(
          "general",
          "showDetails",
          "Show Details",
          "Enables live details tab in live meter for your character."
        )}
        {@render settingOption(
          "general",
          "showRaidsOnly",
          "Show Raids Only",
          "Only show raids in recent encounters (bosses with valid difficulty). Logs from cube, paradise, etc. will be hidden."
        )}
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            bind:checked={settings.app.general.autoIface}
            onchange={() => {}}
            class="form-checkbox size-5 rounded-sm border-0 bg-neutral-700 checked:text-accent-600/80 focus:ring-0"
          />
          <div class="ml-5">
            <div class="text-sm">Auto Port Selection</div>
            <div class="text-xs text-neutral-300">Automatically select port to listen on. (Requires Restart)</div>
          </div>
        </label>
        {#if !settings.app.general.autoIface}
          <div>
            <label class="flex items-center">
              <input
                type="number"
                class="form-input h-8 w-18 rounded-md border-0 bg-neutral-700 text-sm focus:ring-0"
                bind:value={settings.app.general.port}
                placeholder={settings.app.general.port.toString()}
              />
              <div class="ml-5">
                <div>Port</div>
                <div class="text-xs text-neutral-300">
                  Set custom port if not using default. Default is 6040. (Requires Restart)
                </div>
              </div>
            </label>
          </div>
        {/if}
        {@render settingOption(
          "general",
          "experimentalFeatures",
          "Enable Experimental Features",
          "Enables experimental features that may not be fully complete or stable."
        )}
        <div class="w-fit">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.app.general.betaChannel}
              class="form-checkbox size-5 rounded-sm border-0 bg-neutral-700 checked:text-accent-600/80 focus:ring-0"
              onclick={(e) => {
                e.preventDefault();
                if (settings.app.general.betaChannel) {
                  $optOutOpen = true;
                } else {
                  $optInOpen = true;
                }
              }}
            />
            <div class="ml-5">
              <div class="text-sm">Enable Beta Updates</div>
              <div class="text-xs text-neutral-300">
                Opt-in to beta updates. Test out new features before they are officially released.
              </div>
            </div>
          </label>
        </div>
      {:else if currentTab === "Accessibility"}
        {@render scaleOption("meter")}
        {@render scaleOption("logs")}
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            bind:checked={settings.app.general.alwaysOnTop}
            onchange={async () => {
              await setAlwaysOnTop(settings.app.general.alwaysOnTop);
            }}
            class="form-checkbox size-5 rounded-sm border-0 bg-neutral-700 checked:text-accent-600 focus:ring-0"
          />
          <div class="ml-5">
            <div class="text-sm">Always on Top</div>
            <div class="text-xs text-neutral-300">Sets the live meter to always be on top of other windows.</div>
          </div>
        </label>
        {@render settingOption(
          "general",
          "constantLocalPlayerColor",
          "Constant Local Player Color",
          "Keeps the color for the local player the same regardless of class. (Change in Class Colors)"
        )}
        {@render settingOption(
          "general",
          "splitLines",
          "Split Lines",
          "Split breakdown lines with alternating background colors for better readability"
        )}
        {@render settingOption(
          "general",
          "underlineHovered",
          "Underline Hovered",
          "Underlines the text in the row when hovering over it for better readability"
        )}
        {@render settingOption(
          "general",
          "hideMeterOnStart",
          "Hide Meter on Launch",
          "Hide the meter window when starting the app."
        )}
        {@render settingOption(
          "general",
          "hideLogsOnStart",
          "Hide Logs on Launch",
          "Hide the logs window when starting the app."
        )}
        {#if settings.app.general.isWin11}
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              bind:checked={settings.app.general.blurWin11}
              onchange={async () => {
                await setBlur(settings.app.general.blurWin11);
              }}
              class="form-checkbox size-5 rounded-sm border-0 bg-neutral-700 checked:text-accent-600 focus:ring-0"
            />
            <div class="ml-5">
              <div class="text-sm">Blur Meter Background</div>
              <div class="text-xs text-neutral-300">
                Adds background blur effect to live meter (only works on Windows 10).
              </div>
            </div>
          </label>
        {:else}
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              bind:checked={settings.app.general.blur}
              onchange={async () => {
                await setBlur(settings.app.general.blur);
              }}
              class="form-checkbox size-5 rounded-sm border-0 bg-neutral-700 checked:text-accent-600 focus:ring-0"
            />
            <div class="ml-5">
              <div>Blur Meter Background</div>
              <div class="text-xs text-neutral-300">Adds background blur effect to live meter.</div>
            </div>
          </label>
        {/if}
        {#if settings.app.general.isWin11}
          {@render settingOption(
            "general",
            "transparent",
            "Transparent Meter",
            "Turn off to enable Dark Mode for Windows 11 (with blur setting off)."
          )}
        {:else}
          {@render settingOption(
            "general",
            "transparent",
            "Transparent Meter",
            "Toggle transparent background for live meter."
          )}
        {/if}
      {:else if currentTab === "Shortcuts"}
        <Shortcuts />
      {/if}
    </div>
  </div>
</div>

{#if $optInOpen}
  <div use:melt={$optInPortalled}>
    <div use:melt={$optInOverlay} class="fixed inset-0 z-50 bg-black/50" transition:fade={{ duration: 150 }}></div>
    <div
      class="fixed top-1/2 left-1/2 z-50 w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-neutral-800/40 p-6 shadow-lg drop-shadow-xl backdrop-blur-xl
      {settings.app.general.accentColor} flex flex-col gap-4 text-white"
      use:melt={$optInContent}
    >
      <h2 use:melt={$optInTitle} class="text-lg font-semibold">Switch to Beta Channel</h2>
      <p use:melt={$optInDescription} class="text-sm text-neutral-300">
        Your app will check for beta updates. You may test out new features before they are released.
      </p>
      <div class="flex justify-end gap-3">
        <button
          class="rounded-md bg-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-600 focus:ring-0"
          onclick={() => {
            $optInOpen = false;
          }}
        >
          Cancel
        </button>
        <button
          class="rounded-md bg-accent-500/70 px-3 py-1.5 text-sm hover:bg-accent-500/60 focus:ring-0"
          onclick={async () => {
            settings.app.general.betaChannel = true;
            const hasUpdate = await checkForUpdate(true);
            if (hasUpdate) {
              await relaunchApp();
            } else {
              $optInOpen = false;
            }
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
{/if}

{#if $optOutOpen}
  <div use:melt={$optOutPortalled}>
    <div use:melt={$optOutOverlay} class="fixed inset-0 z-50 bg-black/50" transition:fade={{ duration: 150 }}></div>
    <div
      class="fixed top-1/2 left-1/2 z-50 w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-neutral-800/40 p-6 shadow-lg drop-shadow-xl backdrop-blur-xl
      {settings.app.general.accentColor} flex flex-col gap-4 text-white"
      use:melt={$optOutContent}
    >
      <h2 use:melt={$optOutTitle} class="text-lg font-semibold">Switch to Stable Release</h2>
      <p use:melt={$optOutDescription} class="text-sm text-neutral-300">
        The latest stable release will be installed. You will no longer receive beta updates.
      </p>
      <div class="flex justify-end gap-3">
        <button
          class="rounded-md bg-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-600 focus:ring-0"
          onclick={() => {
            $optOutOpen = false;
          }}
        >
          Cancel
        </button>
        <button
          class="rounded-md bg-accent-500/70 px-3 py-1.5 text-sm hover:bg-accent-500/60 focus:ring-0 disabled:opacity-50"
          disabled={installingStable}
          onclick={async () => {
            installingStable = true;
            settings.app.general.betaChannel = false;
            const currentVersion = await getVersion();
            if (currentVersion.includes("-")) {
              await installStableUpdate();
              await relaunchApp();
            } else {
              installingStable = false;
              $optOutOpen = false;
            }
          }}
        >
          {installingStable ? "Switching..." : "Confirm"}
        </button>
      </div>
    </div>
  </div>
{/if}

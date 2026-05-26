<script lang="ts">
  import { saveSettings, getLOAMeterDataPath, listTtsVoices, capturePath } from "$lib/api";
  import OverlayPreviewPanel from "$lib/components/mech/OverlayPreviewPanel.svelte";
  import { revealItemInDir } from "@tauri-apps/plugin-opener";
  import { emit } from "@tauri-apps/api/event";
  import { mechStore } from "$lib/mech-store.svelte";
  import { settings } from "$lib/stores.svelte";
  import { registerShortcuts, shortcuts } from "$lib/utils/shortcuts";
  import { speakTts } from "$lib/utils/tts";
  import { createDialog, melt } from "@melt-ui/svelte";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import Header from "../Header.svelte";

  let currentTab = $state("General");

  const s = $derived(mechStore.mechSettings);

  function upd<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    mechStore.updateSetting(key, value);
  }

  // ── TTS ─────────────────────────────────────────────────────────────
  function testTTS() {
    speakTts("Saws and Spikes incoming", s.voice, s.vol, s.ttsRate ?? 1.0);
  }

  let loaDataPath = $state<string | null>(null);
  let installedVoices = $state<string[]>([]);
  let showVoices = $state(false);

  async function toggleInstalledVoices() {
    if (showVoices) {
      showVoices = false;
      return;
    }
    try {
      installedVoices = await listTtsVoices();
    } catch {
      installedVoices = ["Could not read installed voices"];
    }
    showVoices = true;
  }

  // ── Discord webhook ─────────────────────────────────────────────────
  async function testWebhook() {
    if (!s.hook) return;
    try {
      const res = await fetch(s.hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "🔴 Bomberman · Major",
              description: "HP Bar: 175/300 · Phase 2 · Repeats: 1:10\n\nP2 starts. Every ~70s.",
              color: 0xfb923c,
              footer: { text: "Mech Announcer · Test" }
            }
          ]
        })
      });
      alert(res.ok ? "✅ Webhook delivered!" : `❌ Error: ${res.status}`);
    } catch (e) {
      alert(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── General tab ─────────────────────────────────────────────────────
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

  // Persist settings to Rust and notify overlay window when scale changes
  $effect(() => {
    const scale = settings.app.general.scale;
    saveSettings(settings.app).catch(() => {});
    emit("mech:settings-reload", { scale }).catch(() => {});
  });

  // ── Shortcuts tab ───────────────────────────────────────────────────
  // Existing app shortcuts (hide overlay etc.)
  let shortcutRecordTarget = $state<string | null>(null); // which shortcut action is being recorded
  let shortcutKeys = $state("");
  let shortcutKeyUp = $state(true);

  const {
    elements: {
      trigger: scTrigger,
      portalled: scPortalled,
      overlay: scOverlay,
      content: scContent,
      title: scTitle,
      close: scClose
    },
    states: { open: scOpen }
  } = createDialog();

  const handleScKeydown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (shortcutKeyUp) {
      shortcutKeys = "";
      shortcutKeyUp = false;
    }
    const mods: string[] = [];
    if (e.ctrlKey) mods.push("Ctrl");
    if (e.altKey) mods.push("Alt");
    if (e.shiftKey) mods.push("Shift");
    let key = e.code;
    if (key.startsWith("Key")) key = key.slice(3);
    else if (key.startsWith("Digit")) key = key.slice(5);
    if (!["Control", "Alt", "Shift"].includes(e.key)) {
      shortcutKeys = [...mods, key].join("+");
    } else if (mods.length) {
      shortcutKeys = mods.join("+");
    }
  };
  const handleScKeyUp = () => {
    shortcutKeyUp = true;
  };

  $effect(() => {
    if ($scOpen) {
      shortcutKeys = "";
      document.addEventListener("keydown", handleScKeydown);
      document.addEventListener("keyup", handleScKeyUp);
    } else {
      document.removeEventListener("keydown", handleScKeydown);
      document.removeEventListener("keyup", handleScKeyUp);
    }
  });

  function openRecorder(action: string) {
    shortcutRecordTarget = action;
    shortcutKeys = "";
  }

  function saveShortcut() {
    if (!shortcutRecordTarget || !shortcutKeys) return;
    if (shortcutRecordTarget === "__confirmHotkey__") {
      upd("confirmHotkey", shortcutKeys);
    } else {
      settings.app.shortcuts[shortcutRecordTarget as keyof typeof settings.app.shortcuts] = shortcutKeys;
    }
    // registerShortcuts() is the single path — it unregisters all and re-registers every
    // shortcut including the confirm hotkey, so it covers both branches above.
    registerShortcuts();
  }

  function clearConfirmKey() {
    upd("confirmHotkey", "");
    registerShortcuts(); // re-registers everything; confirm is now blank so it's simply dropped
  }

  // ── Fight capture export (user-facing troubleshooting) ──────────────
  async function openCaptureFolder() {
    try {
      await revealItemInDir(await capturePath());
    } catch (e) {
      console.warn("could not reveal capture file", e);
    }
  }

  onMount(async () => {
    loaDataPath = await getLOAMeterDataPath().catch(() => null);
  });

  onDestroy(() => {
    document.removeEventListener("keydown", handleScKeydown);
    document.removeEventListener("keyup", handleScKeyUp);
    registerShortcuts();
  });
</script>

<!-- ── snippets ──────────────────────────────────────────────────── -->

{#snippet tab(name: string)}
  <button
    class="rounded-sm px-2 py-1 text-sm text-nowrap text-white transition focus:outline-hidden {name === currentTab
      ? 'border-transparent bg-accent-600/80'
      : 'bg-transparent hover:bg-neutral-700/60'}"
    onclick={() => {
      currentTab = name;
    }}>{name}</button
  >
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
        {#if description}<div class="text-xs text-neutral-300">{description}</div>{/if}
      </div>
    </label>
  </div>
{/snippet}

{#snippet sliderField(
  label: string,
  description: string,
  min: number,
  max: number,
  step: number,
  value: number,
  suffix: string,
  onChange: (v: number) => void
)}
  <div class="flex flex-col gap-1">
    <div class="text-sm">{label}</div>
    {#if description}<div class="text-xs text-neutral-300">{description}</div>{/if}
    <div class="flex items-center gap-3 pt-1">
      <input
        type="range"
        {min}
        {max}
        {step}
        {value}
        oninput={(e) => onChange(parseFloat((e.target as HTMLInputElement).value))}
        class="h-[3px] w-full appearance-none rounded bg-neutral-700 accent-accent-500"
      />
      <span class="w-16 shrink-0 text-right font-mono text-sm text-accent-400">{value}{suffix}</span>
    </div>
  </div>
{/snippet}

{#snippet checkField(label: string, description: string, checked: boolean, onChange: (v: boolean) => void)}
  <div class="w-fit">
    <label class="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        {checked}
        onchange={(e) => onChange((e.target as HTMLInputElement).checked)}
        class="form-checkbox size-5 rounded-sm border-0 bg-neutral-700 checked:text-accent-600/80 focus:ring-0"
      />
      <div class="ml-5">
        <div class="text-sm font-semibold">{label}</div>
        {#if description}<div class="text-xs text-neutral-400">{description}</div>{/if}
      </div>
    </label>
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

{#snippet shortcutRow(action: string, label: string, currentKey: string)}
  <div class="flex min-w-80 items-center justify-between gap-2 rounded px-2 py-1 hover:bg-neutral-700/60">
    <p class="text-sm">{label}</p>
    <button
      class="min-w-40 rounded-md bg-neutral-700 px-2 py-1 font-mono text-xs transition hover:bg-neutral-600"
      use:melt={$scTrigger}
      onclick={() => openRecorder(action)}>{currentKey || "None"}</button
    >
  </div>
{/snippet}

<!-- ── page ──────────────────────────────────────────────────────── -->

<Header title="Settings" />

<div class="mx-auto max-w-[180rem] px-8 py-4">
  <div class="flex flex-col gap-2">
    <!-- Tab bar -->
    <div class="flex gap-2 overflow-x-auto px-2 max-md:max-w-[100vw]">
      {@render tab("General")}
      {@render tab("Overlay")}
      {@render tab("Overlay Preview")}
      {@render tab("Announcements")}
      {@render tab("Shortcuts")}
      {@render tab("Discord")}
    </div>

    <!-- Tab content -->
    <div class="flex flex-col gap-4 px-4 py-2">
      <!-- ── Announcements ─────────────────────────────────────── -->
      {#if currentTab === "Announcements"}
        <!-- Master toggle (always interactive) -->
        {@render checkField(
          "Enable TTS Announcements",
          "When off, no mechanic announcements will be spoken. Per-mech TTS settings and the other controls below are preserved but inert until you turn this back on.",
          s.announcementsEnabled !== false,
          (v) => upd("announcementsEnabled", v)
        )}

        <div
          class="flex flex-col gap-4 transition-opacity {s.announcementsEnabled === false
            ? 'pointer-events-none opacity-40 select-none'
            : ''}"
          aria-disabled={s.announcementsEnabled === false}
        >
          <!-- TIMING section -->
          <div class="flex items-center gap-3 pt-1">
            <span class="text-xs font-semibold tracking-widest text-accent-400 uppercase">Timing</span>
            <div class="h-px flex-1 bg-accent-500/20"></div>
          </div>

          <!-- HP Trigger Lead Time -->
          <div class="flex flex-col gap-1">
            <div class="text-sm font-semibold">HP Trigger Lead Time</div>
            <div class="text-xs text-neutral-400">
              How many HP bars before an HP-triggered mechanic fires to announce it
            </div>
            <div class="flex items-center gap-3 pt-1">
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={s.lead}
                oninput={(e) => upd("lead", parseInt((e.target as HTMLInputElement).value))}
                class="h-[3px] flex-1 appearance-none rounded bg-neutral-700 accent-accent-500"
              />
              <div
                class="w-20 shrink-0 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-center font-mono text-sm text-accent-400"
              >
                {s.lead} bars
              </div>
            </div>
          </div>

          <!-- Repeating Pattern Lead Time -->
          <div class="flex flex-col gap-1">
            <div class="text-sm font-semibold">Repeating Pattern Lead Time</div>
            <div class="text-xs text-neutral-400">
              How many seconds before a repeating mechanic fires again to announce it
            </div>
            <div class="flex items-center gap-3 pt-1">
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={s.repeatLead}
                oninput={(e) => upd("repeatLead", parseInt((e.target as HTMLInputElement).value))}
                class="h-[3px] flex-1 appearance-none rounded bg-neutral-700 accent-accent-500"
              />
              <div
                class="w-20 shrink-0 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-center font-mono text-sm text-accent-400"
              >
                {s.repeatLead}s
              </div>
            </div>
          </div>

          <!-- VOICE section -->
          <div class="flex items-center gap-3 pt-2">
            <span class="text-xs font-semibold tracking-widest text-accent-400 uppercase">Voice</span>
            <div class="h-px flex-1 bg-accent-500/20"></div>
          </div>

          <!-- Volume -->
          <div class="flex flex-col gap-1">
            <div class="text-sm font-semibold">Volume</div>
            <div class="text-xs text-neutral-400">TTS announcement volume</div>
            <div class="flex items-center gap-3 pt-1">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={s.vol}
                oninput={(e) => upd("vol", parseInt((e.target as HTMLInputElement).value))}
                class="h-[3px] flex-1 appearance-none rounded bg-neutral-700 accent-accent-500"
              />
              <div
                class="w-20 shrink-0 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-center font-mono text-sm text-accent-400"
              >
                {s.vol}%
              </div>
            </div>
          </div>

          <!-- Speech Rate -->
          <div class="flex flex-col gap-1">
            <div class="text-sm font-semibold">Speech Rate</div>
            <div class="text-xs text-neutral-400">How fast the TTS voice speaks. 1.0× is normal speed.</div>
            <div class="flex items-center gap-3 pt-1">
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={s.ttsRate ?? 1.0}
                oninput={(e) => upd("ttsRate", parseFloat((e.target as HTMLInputElement).value))}
                class="h-[3px] flex-1 appearance-none rounded bg-neutral-700 accent-accent-500"
              />
              <div
                class="w-20 shrink-0 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-center font-mono text-sm text-accent-400"
              >
                {(s.ttsRate ?? 1.0).toFixed(1)}×
              </div>
            </div>
          </div>

          <!-- Voice picker + Test button on same row -->
          <div class="flex items-center gap-4 pt-1">
            <div class="flex items-center gap-2">
              {#each ["Andrew", "Jenny"] as const as voiceName}
                <button
                  onclick={() => upd("voice", voiceName)}
                  class="rounded-sm px-4 py-1.5 text-sm font-medium transition {s.voice === voiceName
                    ? 'bg-accent-600/80 text-white'
                    : 'bg-neutral-700/60 text-neutral-300 hover:bg-neutral-700'}">{voiceName}</button
                >
              {/each}
              <span class="pl-1 text-sm text-neutral-400">Voice</span>
            </div>
          </div>

          <!-- Test button + voice debug -->
          <div class="flex flex-wrap items-center gap-3">
            <button
              onclick={testTTS}
              class="flex items-center gap-2 rounded-md border border-accent-500/40 bg-accent-600/20 px-4 py-2 text-sm font-semibold text-accent-400 transition hover:bg-accent-600/30"
            >
              🔊 Test Announcement
            </button>
            <button
              onclick={toggleInstalledVoices}
              class="text-xs text-neutral-500 underline underline-offset-2 transition hover:text-neutral-300"
            >
              {showVoices ? "Hide installed voices" : "Show installed voices"}
            </button>
          </div>

          {#if showVoices}
            <div class="rounded-md border border-neutral-700 bg-neutral-800/60 px-4 py-3">
              <div class="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Installed Voices</div>
              {#each installedVoices as v}
                <div
                  class="py-0.5 text-xs text-neutral-400 {v.toLowerCase().includes('andrew') ||
                  v.toLowerCase().includes('jenny')
                    ? 'font-medium text-accent-400'
                    : ''}"
                >
                  {v}
                </div>
              {:else}
                <div class="text-xs text-neutral-500">No voices found</div>
              {/each}
            </div>
          {/if}
        </div>
        <!-- /announcementsEnabled wrapper -->

        <!-- ── Discord ───────────────────────────────────────────── -->
      {:else if currentTab === "Discord"}
        <!-- Master toggle (always interactive) -->
        {@render checkField(
          "Enable Discord Webhook",
          "When off, no embeds will be posted to your webhook URL. The URL and other settings below are preserved but inert until you turn this back on.",
          s.webhookEnabled !== false,
          (v) => upd("webhookEnabled", v)
        )}

        <div
          class="flex flex-col gap-4 transition-opacity {s.webhookEnabled === false
            ? 'pointer-events-none opacity-40 select-none'
            : ''}"
          aria-disabled={s.webhookEnabled === false}
        >
          <!-- CONNECTION section -->
          <div class="flex items-center gap-3 pt-1">
            <span class="text-xs font-semibold tracking-widest text-accent-400 uppercase">Connection</span>
            <div class="h-px flex-1 bg-accent-500/20"></div>
          </div>

          <div class="flex flex-col gap-1">
            <div class="text-sm font-semibold">Webhook URL</div>
            <div class="text-xs text-neutral-400">
              Announcements are posted as Discord embeds each time a mechanic fires
            </div>
            <input
              type="url"
              value={s.hook}
              oninput={(e) => upd("hook", (e.target as HTMLInputElement).value)}
              placeholder="https://discord.com/api/webhooks/..."
              class="mt-2 w-full rounded-md border-0 bg-neutral-700 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>

          <div>
            <button
              onclick={testWebhook}
              disabled={!s.hook}
              class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition {s.hook
                ? 'cursor-pointer border border-indigo-500/40 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30'
                : 'cursor-not-allowed border border-neutral-700 bg-neutral-800 text-neutral-500 opacity-50'}"
            >
              Test Webhook
            </button>
          </div>

          <!-- PREVIEW section -->
          <div class="flex items-center gap-3 pt-2">
            <span class="text-xs font-semibold tracking-widest text-accent-400 uppercase">Preview</span>
            <div class="h-px flex-1 bg-accent-500/20"></div>
          </div>

          <div class="rounded-md border border-neutral-700 bg-neutral-800/60 p-4">
            <div class="mb-2 text-xs font-semibold tracking-wide text-indigo-400 uppercase">Embed Preview</div>
            <div class="space-y-1 rounded border-l-4 border-orange-400 bg-neutral-900 px-3 py-2 font-mono text-xs">
              <div class="font-bold text-orange-400">⚠️ Bomberman · Major</div>
              <div class="text-neutral-400">HP Bar: 175/300 · Phase 2 · Repeats: 1:10</div>
              <div class="text-neutral-500">P2 starts. Every ~70s. Move/explode to x shape on edge.</div>
              <div class="pt-1 text-[10px] text-neutral-600">Mech Announcer · Serca G1</div>
            </div>
          </div>
        </div>
        <!-- /webhookEnabled wrapper -->

        <!-- ── Overlay Preview ─────────────────────────────────── -->
      {:else if currentTab === "Overlay Preview"}
        <div
          style="height: 520px; margin: -0.5rem -1rem; border-radius: 6px; overflow: hidden; border: 1px solid #262626;"
        >
          <OverlayPreviewPanel />
        </div>

        <!-- ── Overlay ───────────────────────────────────────────── -->
      {:else if currentTab === "Overlay"}
        <!-- WINDOW section -->
        <div class="flex items-center gap-3 pt-1">
          <span class="text-xs font-semibold tracking-widest text-accent-400 uppercase">Window</span>
          <div class="h-px flex-1 bg-accent-500/20"></div>
        </div>

        <!-- Opacity -->
        <div class="flex flex-col gap-1">
          <div class="text-sm font-semibold">Opacity</div>
          <div class="text-xs text-neutral-400">Transparency of the overlay window</div>
          <div class="flex items-center gap-3 pt-1">
            <input
              type="range"
              min={40}
              max={100}
              step={1}
              value={s.opacity}
              oninput={(e) => upd("opacity", parseInt((e.target as HTMLInputElement).value))}
              class="h-[3px] flex-1 appearance-none rounded bg-neutral-700 accent-accent-500"
            />
            <div
              class="w-20 shrink-0 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-center font-mono text-sm text-accent-400"
            >
              {s.opacity}%
            </div>
          </div>
        </div>

        <!-- Window checkboxes -->
        {@render checkField(
          "Always on Top",
          "Keep the overlay above all other windows including the game.",
          s.alwaysOnTop,
          (v) => upd("alwaysOnTop", v)
        )}
        {@render checkField(
          "Click-Through Mode",
          "Mouse clicks pass through the overlay to the game underneath.",
          s.clickThrough,
          (v) => upd("clickThrough", v)
        )}
        {@render checkField(
          "Auto Show / Hide",
          "Show the overlay when an encounter starts and hide when it ends.",
          s.autoShowHide,
          (v) => upd("autoShowHide", v)
        )}

        <!-- DISPLAY section -->
        <div class="flex items-center gap-3 pt-2">
          <span class="text-xs font-semibold tracking-widest text-accent-400 uppercase">Display</span>
          <div class="h-px flex-1 bg-accent-500/20"></div>
        </div>

        {@render checkField(
          "Phase Labels",
          "Display PHASE 2, PHASE 3 etc. on the primary mechanic card.",
          s.showPhaseLabels,
          (v) => upd("showPhaseLabels", v)
        )}
        {@render checkField(
          "Repeat Cycle Ticker",
          "After a repeating mech fires, show a live countdown to its next repeat.",
          s.showRepeatTicker,
          (v) => upd("showRepeatTicker", v)
        )}

        <!-- ── General (Appearance + Scaling + Shortcuts) ────────── -->
      {:else if currentTab === "General"}
        <!-- APPEARANCE -->
        <div class="flex items-center gap-3 pt-1">
          <span class="text-xs font-semibold tracking-widest text-accent-400 uppercase">Appearance</span>
          <div class="h-px flex-1 bg-accent-500/20"></div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-sm font-semibold">Color Theme</div>
          <div class="flex flex-wrap items-center gap-2">
            {#each themes as theme}
              {@render themePreview(theme.name, theme.color)}
            {/each}
          </div>
        </div>

        <!-- SCALING -->
        <div class="flex items-center gap-3 pt-2">
          <span class="text-xs font-semibold tracking-widest text-accent-400 uppercase">Scaling</span>
          <div class="h-px flex-1 bg-accent-500/20"></div>
        </div>
        <div class="flex items-center gap-3">
          <select
            bind:value={settings.app.general.logScale}
            class="w-28 rounded-lg bg-neutral-700 px-2 py-1.5 text-sm outline-none focus:border-accent-500 focus:ring-1"
          >
            <option value="0">Small</option>
            <option value="1">Normal</option>
            <option value="2">Large</option>
            <option value="3">Largest</option>
          </select>
          <div>
            <div class="text-sm font-semibold">Settings UI Scale</div>
            <div class="text-xs text-neutral-400">Scales the settings and editor windows</div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <select
            bind:value={settings.app.general.scale}
            class="w-28 rounded-lg bg-neutral-700 px-2 py-1.5 text-sm outline-none focus:border-accent-500 focus:ring-1"
          >
            <option value="0">Small</option>
            <option value="1">Normal</option>
            <option value="2">Large</option>
            <option value="3">Largest</option>
          </select>
          <div>
            <div class="text-sm font-semibold">Overlay UI Scale</div>
            <div class="text-xs text-neutral-400">Scales the live game overlay window</div>
          </div>
        </div>

        <!-- DATA SOURCE -->
        <div class="flex items-center gap-3 pt-2">
          <span class="text-xs font-semibold tracking-widest text-accent-400 uppercase">Data Source</span>
          <div class="h-px flex-1 bg-accent-500/20"></div>
        </div>
        <div class="mt-2 flex items-center gap-2 text-xs text-neutral-400">
          <span class="font-medium text-neutral-300">Game data:</span>
          {#if loaDataPath}
            <span class="text-emerald-400">LOA Logs</span>
            <span class="max-w-xs truncate" title={loaDataPath}>{loaDataPath}</span>
          {:else}
            <span class="text-amber-400">Bundled (LOA Logs not found)</span>
          {/if}
        </div>

        <!-- TROUBLESHOOTING -->
        <div class="flex items-center gap-3 pt-2">
          <span class="text-xs font-semibold tracking-widest text-accent-400 uppercase">Troubleshooting</span>
          <div class="h-px flex-1 bg-accent-500/20"></div>
        </div>
        <div class="flex items-center gap-3">
          <button
            onclick={openCaptureFolder}
            class="rounded-lg bg-neutral-700 px-3 py-1.5 text-sm whitespace-nowrap transition hover:bg-neutral-600"
            >Open capture folder</button
          >
          <div class="max-w-md text-xs text-neutral-400">
            Each fight is saved to a local capture file. If a mechanic misbehaves, open the folder and send us that file
            so we can reproduce it.
          </div>
        </div>
      {:else if currentTab === "Shortcuts"}
        <div
          class="w-fit rounded-md border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400"
        >
          Shortcuts are paused while on this tab
        </div>

        <!-- Confirm Pattern -->
        <div class="flex flex-col gap-1">
          <div class="text-sm font-semibold">Confirm Pattern</div>
          <div class="text-xs text-neutral-400">
            Press in-raid when a repeating mechanic fires - resyncs the timer if it has drifted.
          </div>
          <div class="flex items-center gap-2 pt-2">
            <button
              use:melt={$scTrigger}
              onclick={() => openRecorder("__confirmHotkey__")}
              class="min-w-44 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-left font-mono text-sm transition hover:bg-neutral-700"
            >
              {s.confirmHotkey || "None - click to record"}
            </button>
            {#if s.confirmHotkey}
              <button
                onclick={clearConfirmKey}
                class="px-2 py-1.5 text-xs text-neutral-500 transition hover:text-red-400">Clear</button
              >
            {/if}
          </div>
        </div>

        <!-- Hide Overlay shortcut -->
        <div class="flex flex-col gap-1">
          <div class="text-sm font-semibold">Hide Overlay</div>
          <div class="text-xs text-neutral-400">Toggle the mech overlay window visibility.</div>
          <div class="flex items-center gap-2 pt-2">
            <button
              use:melt={$scTrigger}
              onclick={() => openRecorder("hideOverlay")}
              class="min-w-44 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-left font-mono text-sm transition hover:bg-neutral-700"
            >
              {settings.app.shortcuts.hideOverlay || "None - click to record"}
            </button>
            {#if settings.app.shortcuts.hideOverlay}
              <button
                onclick={() => {
                  settings.app.shortcuts.hideOverlay = "";
                  registerShortcuts();
                }}
                class="px-2 py-1.5 text-xs text-neutral-500 transition hover:text-red-400">Clear</button
              >
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Shortcut recording modal -->
{#if $scOpen}
  <div use:melt={$scPortalled}>
    <div use:melt={$scOverlay} class="fixed inset-0 z-50 bg-black/50" transition:fade={{ duration: 150 }}></div>
    <div
      use:melt={$scContent}
      class="fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-neutral-800 p-6 shadow-lg {settings
        .app.general.accentColor} flex flex-col items-center gap-4 text-white"
    >
      <h2 use:melt={$scTitle} class="font-semibold">Record Shortcut</h2>
      <p class="min-w-40 rounded bg-neutral-900 px-4 py-3 text-center font-mono text-sm">
        {shortcutKeys || "listening…"}
      </p>
      <div class="flex gap-3">
        <button use:melt={$scClose} class="rounded-md bg-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-600"
          >Cancel</button
        >
        <button
          use:melt={$scClose}
          onclick={saveShortcut}
          disabled={!shortcutKeys}
          class="rounded-md px-3 py-1.5 text-sm {shortcutKeys
            ? 'bg-accent-500/70 hover:bg-accent-500/60'
            : 'cursor-not-allowed bg-neutral-700 opacity-50'}"
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

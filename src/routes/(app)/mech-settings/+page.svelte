<script lang="ts">
  import { mechStore } from "$lib/mech-store.svelte";
  import Header from "../Header.svelte";

  const s = $derived(mechStore.mechSettings);

  function upd<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    mechStore.updateSetting(key, value);
  }

  function testTTS() {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Saws and Spikes incoming");
      u.volume = s.vol / 100;
      u.pitch = s.pitch;
      speechSynthesis.speak(u);
    } catch (e) { console.warn("TTS error", e); }
  }

  async function testWebhook() {
    if (!s.hook) return;
    try {
      const res = await fetch(s.hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "🔴 Bomberman · Major",
            description: "HP Bar: 175/300 · Phase 2 · Repeats: 1:10\n\nP2 starts. Every ~70s. Move/explode to x shape on edge.",
            color: 0xfb923c,
            footer: { text: "Mech Announcer · Test" },
          }],
        }),
      });
      alert(res.ok ? "✅ Webhook delivered!" : `❌ Error: ${res.status}`);
    } catch (e) {
      alert(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }
</script>

<Header title="Mech Settings" />

<div style="overflow-y: auto; height: calc(100vh - 64px); padding: 24px 32px;">
  <div style="max-width: 620px;">

    <!-- TTS Section -->
    <div style="margin-bottom: 26px;">
      <div style="font-size: 13px; font-weight: 700; color: #fafafa; margin-bottom: 6px; letter-spacing: 0.01em;">Text-to-Speech</div>
      <div style="height: 1px; background: #262626; margin-bottom: 16px;" />

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 1px;">Announcement Lead Time</div>
        <div style="font-size: 11px; color: #a3a3a3; margin-bottom: 6px;">How many HP bars before threshold to begin announcing</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" min={1} max={30} value={s.lead}
            oninput={(e) => upd("lead", parseInt((e.target as HTMLInputElement).value))}
            style="flex: 1; accent-color: #38bdf8;" />
          <span style="font-size: 12px; font-family: ui-monospace, monospace; color: #38bdf8; min-width: 56px; text-align: right; font-weight: 600;">{s.lead} bars</span>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 6px;">Volume</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" min={0} max={100} value={s.vol}
            oninput={(e) => upd("vol", parseInt((e.target as HTMLInputElement).value))}
            style="flex: 1; accent-color: #38bdf8;" />
          <span style="font-size: 12px; font-family: ui-monospace, monospace; color: #38bdf8; min-width: 56px; text-align: right; font-weight: 600;">{s.vol}%</span>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 6px;">Pitch</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" min={0.5} max={2} step={0.1} value={s.pitch}
            oninput={(e) => upd("pitch", parseFloat((e.target as HTMLInputElement).value))}
            style="flex: 1; accent-color: #38bdf8;" />
          <span style="font-size: 12px; font-family: ui-monospace, monospace; color: #38bdf8; min-width: 56px; text-align: right; font-weight: 600;">{s.pitch}×</span>
        </div>
      </div>

      <button onclick={testTTS} style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); border-radius: 4px; padding: 7px 14px; color: #38bdf8; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit;">🔊 Test TTS</button>
    </div>

    <!-- Discord Section -->
    <div style="margin-bottom: 26px;">
      <div style="font-size: 13px; font-weight: 700; color: #fafafa; margin-bottom: 6px; letter-spacing: 0.01em;">Discord Integration</div>
      <div style="height: 1px; background: #262626; margin-bottom: 16px;" />

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 1px;">Webhook URL</div>
        <div style="font-size: 11px; color: #a3a3a3; margin-bottom: 6px;">Announcements are posted as embeds to this channel when a mech fires</div>
        <input
          type="url"
          value={s.hook}
          oninput={(e) => upd("hook", (e.target as HTMLInputElement).value)}
          placeholder="https://discord.com/api/webhooks/..."
          style="width: 100%; background: #0a0a0a; border: 1px solid #262626; border-radius: 4px; padding: 8px 12px; color: #fafafa; font-size: 12.5px; outline: none; font-family: inherit;"
        />
      </div>

      <button
        onclick={testWebhook}
        disabled={!s.hook}
        style="background: {s.hook ? 'rgba(88,101,242,0.14)' : '#262626'}; border: 1px solid {s.hook ? 'rgba(88,101,242,0.4)' : '#262626'}; border-radius: 4px; padding: 7px 14px; color: {s.hook ? '#818cf8' : '#525252'}; cursor: {s.hook ? 'pointer' : 'not-allowed'}; font-size: 12px; font-weight: 600; opacity: {s.hook ? 1 : 0.5}; font-family: inherit; margin-bottom: 12px;"
      >Test Webhook</button>

      <div style="padding: 10px 12px; background: rgba(88,101,242,0.05); border: 1px solid rgba(88,101,242,0.2); border-radius: 4px; font-size: 11px; color: #a3a3a3; line-height: 1.55;">
        <div style="color: #818cf8; font-weight: 600; margin-bottom: 4px;">Embed preview</div>
        <div style="font-family: ui-monospace, monospace; font-size: 10.5px; color: #525252;">
          <div style="color: #fb923c; font-weight: 700;">▶ Bomberman · Major</div>
          <div>HP Bar: 175/300 · Phase 2 · Repeats: 1:10</div>
          <div style="opacity: 0.8;">P2 starts. Every ~70s. Move/explode to x shape on edge.</div>
        </div>
      </div>
    </div>

    <!-- Overlay Section -->
    <div style="margin-bottom: 26px;">
      <div style="font-size: 13px; font-weight: 700; color: #fafafa; margin-bottom: 6px; letter-spacing: 0.01em;">Overlay</div>
      <div style="height: 1px; background: #262626; margin-bottom: 16px;" />

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 6px;">Opacity</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" min={40} max={100} value={s.opacity}
            oninput={(e) => upd("opacity", parseInt((e.target as HTMLInputElement).value))}
            style="flex: 1; accent-color: #38bdf8;" />
          <span style="font-size: 12px; font-family: ui-monospace, monospace; color: #38bdf8; min-width: 56px; text-align: right; font-weight: 600;">{s.opacity}%</span>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 6px;">Always on top</div>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; color: #fafafa;">
          <input type="checkbox" checked={s.alwaysOnTop}
            onchange={(e) => upd("alwaysOnTop", (e.target as HTMLInputElement).checked)}
            style="accent-color: #38bdf8; width: 14px; height: 14px;" />
          Keep overlay above all other windows
        </label>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 6px;">Click-through mode</div>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; color: #fafafa;">
          <input type="checkbox" checked={s.clickThrough}
            onchange={(e) => upd("clickThrough", (e.target as HTMLInputElement).checked)}
            style="accent-color: #38bdf8; width: 14px; height: 14px;" />
          Mouse clicks pass through to game underneath
        </label>
      </div>
    </div>

  </div>
</div>

<script lang="ts">
  import { formatTimer } from "$lib/mech-constants";
  import type { Mechanic, Phase, Severity, TriggerType } from "$lib/mech-types";

  interface Props {
    mech: Mechanic | null;
    totalBars: number;
    onSave: (m: Mechanic) => void;
    onClose: () => void;
  }
  let { mech, totalBars, onSave, onClose }: Props = $props();

  const isEdit = $derived(mech != null && !!mech.id);

  type FormState = {
    name: string;
    severity: Severity;
    triggerType: TriggerType;
    hpBar: string;
    phase: string;
    repeatSecs: string;
    timerSecs: string;
    ttsEnabled: boolean;
    ttsText: string;
    notes: string;
  };

  // svelte-ignore state_referenced_locally
  let form = $state<FormState>(
    mech
      ? {
          name: mech.name,
          severity: mech.severity,
          triggerType: mech.triggerType,
          hpBar: mech.hpBar != null ? String(mech.hpBar) : "",
          phase: mech.phase != null ? String(mech.phase) : "",
          repeatSecs: mech.repeatSecs != null ? String(mech.repeatSecs) : "",
          timerSecs: mech.timerSecs != null ? String(mech.timerSecs) : "",
          ttsEnabled: mech.ttsEnabled,
          ttsText: mech.ttsText,
          notes: mech.notes
        }
      : {
          name: "",
          severity: "major",
          triggerType: "hp",
          hpBar: "",
          phase: "",
          repeatSecs: "",
          timerSecs: "",
          ttsEnabled: true,
          ttsText: "",
          notes: ""
        }
  );

  function save() {
    if (!form.name.trim()) return;
    onSave({
      ...(mech ?? {}),
      id: mech?.id || `m-${Date.now()}`,
      name: form.name.trim(),
      severity: form.severity,
      triggerType: form.triggerType,
      hpBar: form.hpBar !== "" ? parseInt(form.hpBar) : null,
      phase: form.phase !== "" ? (parseInt(form.phase) as Phase) : null,
      repeatSecs: form.repeatSecs !== "" ? parseInt(form.repeatSecs) : null,
      timerSecs: form.timerSecs !== "" ? parseInt(form.timerSecs) : null,
      ttsEnabled: form.ttsEnabled,
      ttsText: form.ttsText,
      notes: form.notes
    } as Mechanic);
  }

  const inp =
    "width: 100%; background: #0a0a0a; border: 1px solid #262626; border-radius: 4px; padding: 7px 10px; color: #fafafa; font-size: 13px; outline: none; font-family: inherit;";
  const sel =
    "width: 100%; background: #262626; border: 1px solid #262626; border-radius: 4px; padding: 7px 10px; color: #fafafa; font-size: 13px; outline: none; font-family: inherit;";
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  style="position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);"
>
  <div
    style="background: #171717; border: 1px solid #404040; border-radius: 8px; width: 470px; max-height: 90vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.7);"
  >
    <!-- Header -->
    <div
      style="padding: 14px 18px; border-bottom: 1px solid #262626; display: flex; justify-content: space-between; align-items: center;"
    >
      <span style="font-weight: 600; font-size: 14px;">{isEdit ? "Edit Mechanic" : "Add Mechanic"}</span>
      <button
        onclick={onClose}
        style="background: transparent; border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #a3a3a3;"
        onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fafafa")}
        onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = "#a3a3a3")}>✕</button
      >
    </div>

    <!-- Body -->
    <div style="padding: 18px;">
      <!-- Name -->
      <div style="margin-bottom: 14px;">
        <div class="field-label">Mechanic Name</div>
        <input style={inp} bind:value={form.name} placeholder="e.g. Saws & Spikes" />
      </div>

      <!-- Severity + Trigger -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
        <div>
          <div class="field-label">Severity</div>
          <select style={sel} bind:value={form.severity}>
            <option value="normal">Normal</option>
            <option value="major">Major</option>
            <option value="wipe">Wipe Mech</option>
          </select>
        </div>
        <div>
          <div class="field-label">Trigger</div>
          <select style={sel} bind:value={form.triggerType}>
            <option value="hp">HP Bar</option>
            <option value="timer">Timer (from pull)</option>
            <option value="hp+timer">HP + Repeating</option>
          </select>
        </div>
      </div>

      <!-- HP bar + Phase -->
      {#if form.triggerType === "hp" || form.triggerType === "hp+timer"}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div>
            <div class="field-label">HP Bar Threshold</div>
            <input type="number" style={inp} bind:value={form.hpBar} placeholder="/{totalBars}" />
          </div>
          <div>
            <div class="field-label">Phase</div>
            <select style={sel} bind:value={form.phase}>
              <option value="">No Phase</option>
              <option value="1">Phase 1</option>
              <option value="2">Phase 2</option>
              <option value="3">Phase 3</option>
              <option value="4">Phase 4</option>
            </select>
          </div>
        </div>
      {/if}

      <!-- Repeat interval (hp+timer) -->
      {#if form.triggerType === "hp+timer"}
        <div style="margin-bottom: 14px;">
          <div class="field-label">Repeat Interval (seconds)</div>
          <input type="number" style={inp} bind:value={form.repeatSecs} placeholder="e.g. 60" />
          {#if form.repeatSecs}
            <div style="font-size: 12px; color: #8a8a8a; margin-top: 3px; font-family: ui-monospace, monospace;">
              Repeats every {formatTimer(parseInt(form.repeatSecs))} after first trigger
            </div>
          {/if}
        </div>
      {/if}

      <!-- Timer -->
      {#if form.triggerType === "timer"}
        <div style="margin-bottom: 14px;">
          <div class="field-label">Timer (seconds from pull)</div>
          <input type="number" style={inp} bind:value={form.timerSecs} placeholder="e.g. 510 for 8:30" />
          {#if form.timerSecs}
            <div style="font-size: 12px; color: #8a8a8a; margin-top: 3px; font-family: ui-monospace, monospace;">
              = {formatTimer(parseInt(form.timerSecs))} from pull
            </div>
          {/if}
        </div>
      {/if}

      <!-- TTS section -->
      <div
        style="background: #0f0f0f; border: 1px solid #262626; border-radius: 5px; padding: 12px 14px; margin-bottom: 14px;"
      >
        <label
          style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; color: #fafafa; margin-bottom: {form.ttsEnabled
            ? 10
            : 0}px;"
        >
          <input
            type="checkbox"
            bind:checked={form.ttsEnabled}
            style="accent-color: #38bdf8; width: 13px; height: 13px;"
          />
          Text-to-Speech announcement
        </label>
        {#if form.ttsEnabled}
          <div class="field-label">TTS Text</div>
          <input style={inp} bind:value={form.ttsText} placeholder={form.name || "Announcement..."} />
        {/if}
      </div>

      <!-- Notes -->
      <div>
        <div class="field-label">Notes</div>
        <textarea
          bind:value={form.notes}
          placeholder="Strategy notes..."
          style="{inp} min-height: 66px; resize: vertical; line-height: 1.5; font-size: 12px;"
        ></textarea>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 12px 18px; border-top: 1px solid #262626; display: flex; justify-content: flex-end; gap: 8px;">
      <button
        onclick={onClose}
        style="background: #262626; border: 1px solid #262626; border-radius: 4px; padding: 7px 14px; color: #a3a3a3; cursor: pointer; font-size: 12.5px; font-family: inherit;"
        >Cancel</button
      >
      <button
        onclick={save}
        disabled={!form.name.trim()}
        style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); border-radius: 4px; padding: 7px 14px; color: #38bdf8; cursor: {form.name.trim()
          ? 'pointer'
          : 'not-allowed'}; font-size: 12.5px; font-weight: 600; opacity: {form.name.trim()
          ? 1
          : 0.5}; font-family: inherit;">{isEdit ? "Save" : "Add"}</button
      >
    </div>
  </div>
</div>

<style>
  .field-label {
    font-size: 12px;
    color: #a3a3a3;
    margin-bottom: 5px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
</style>

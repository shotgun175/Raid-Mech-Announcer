<script lang="ts">
  import { formatTimer } from "$lib/mech-constants";
  import type { Difficulty, Mechanic, MechanicSource, Phase, Severity, TriggerType } from "$lib/mech-types";
  import { DIFFICULTY_ORDER, DIFFICULTY_STYLE } from "$lib/utils/difficulty";

  interface Props {
    mech: Mechanic | null;
    totalBars: number;
    availableDifficulties: Difficulty[];
    defaultPhase?: number | null;
    onSave: (m: Mechanic) => void;
    onClose: () => void;
  }
  let { mech, totalBars, availableDifficulties, defaultPhase, onSave, onClose }: Props = $props();

  const isEdit = $derived(mech != null && !!mech.id);

  // Read-only provenance shown as a quiet footer note. Library data, not user-set,
  // so it's surfaced here on demand rather than as a badge in the mechanic list.
  const SOURCE_LABEL: Record<MechanicSource, { text: string; dot: string }> = {
    "maxroll": { text: "Maxroll guide", dot: "#818cf8" },
    "verified-in-fight": { text: "Verified in-fight", dot: "#4ade80" },
    "estimated": { text: "Estimated", dot: "#fbbf24" }
  };
  const sourceLabel = $derived(mech?.source ? SOURCE_LABEL[mech.source] : null);

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
    difficulties: Difficulty[];
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
          notes: mech.notes,
          difficulties: mech.difficulties ?? []
        }
      : {
          name: "",
          severity: "major",
          triggerType: "hp",
          hpBar: "",
          phase: defaultPhase != null ? String(defaultPhase) : "",
          repeatSecs: "",
          timerSecs: "",
          ttsEnabled: false,
          ttsText: "",
          notes: "",
          difficulties: []
        }
  );

  // Required-field validation, mirrors the red-asterisk markers in the template.
  // `name` is always required. The numeric fields are required per the trigger type:
  //   hp        → hpBar
  //   hp+timer  → hpBar + repeatSecs
  //   timer     → timerSecs
  const needsHpBar = $derived(form.triggerType === "hp" || form.triggerType === "hp+timer");
  const needsRepeatSecs = $derived(form.triggerType === "hp+timer");
  const needsTimerSecs = $derived(form.triggerType === "timer");
  // A library mech can ship with no trigger values at all (Horizon Cathedral G2's
  // Identity-gauge mechanics — the app has no data path to trigger them). Editing
  // such a mech must stay saveable without inventing a value, so the per-trigger-type
  // requirements are waived while the mech remains trigger-less; they apply again
  // the moment any trigger field is filled in.
  const openedTriggerless = $derived(
    mech != null && mech.hpBar == null && mech.timerSecs == null && mech.repeatSecs == null
  );
  const stillTriggerless = $derived(form.hpBar === "" && form.repeatSecs === "" && form.timerSecs === "");
  const isValid = $derived(
    form.name.trim() !== "" &&
      ((openedTriggerless && stillTriggerless) ||
        ((!needsHpBar || form.hpBar !== "") &&
          (!needsRepeatSecs || form.repeatSecs !== "") &&
          (!needsTimerSecs || form.timerSecs !== "")))
  );

  function save() {
    if (!isValid) return;
    // For new mechs, mark as user-created custom. For edits, preserve the original's
    // key/origin; the store's upsertMechanic will flip userEdited:true if the original
    // was a library mech.
    const originFields: Pick<Mechanic, "key" | "origin" | "userEdited"> = mech
      ? { key: mech.key, origin: mech.origin, userEdited: mech.userEdited }
      : { origin: "custom", userEdited: true };
    onSave({
      ...(mech ?? {}),
      ...originFields,
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
      notes: form.notes,
      difficulties: form.difficulties.length ? form.difficulties : undefined
    } as Mechanic);
  }

  const inp =
    "width: 100%; background: #0a0a0a; border: 1px solid #262626; border-radius: 4px; padding: 7px 10px; color: #fafafa; font-size: 13px; outline: none; font-family: inherit;";
  const sel =
    "width: 100%; background: #262626; border: 1px solid #262626; border-radius: 4px; padding: 7px 10px; color: #fafafa; font-size: 13px; outline: none; font-family: inherit;";
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape") onClose();
  }}
/>

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
        <div class="field-label">Mechanic Name<span class="req-asterisk">*</span></div>
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

      <!-- HP bar threshold. Phase is intentionally not editable here: it advances only on a
           boss revival (see mech-reducer isRevival), so it's library-curated data, not a
           free field. The form still carries the original phase through `save()` untouched. -->
      {#if form.triggerType === "hp" || form.triggerType === "hp+timer"}
        <div style="margin-bottom: 14px;">
          <div class="field-label">HP Bar Threshold<span class="req-asterisk">*</span></div>
          <input type="number" style={inp} bind:value={form.hpBar} placeholder="/{totalBars}" />
        </div>
      {/if}

      <!-- Repeat interval (hp+timer) -->
      {#if form.triggerType === "hp+timer"}
        <div style="margin-bottom: 14px;">
          <div class="field-label">Repeat Interval (seconds)<span class="req-asterisk">*</span></div>
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
          <div class="field-label">Timer (seconds from pull)<span class="req-asterisk">*</span></div>
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

      <!-- Difficulties -->
      {#if availableDifficulties.length === 1}
        {@const onlySty = DIFFICULTY_STYLE[availableDifficulties[0]]}
        <div style="margin-bottom: 14px;">
          <div class="field-label">Difficulty</div>
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
            <span
              style="background: {onlySty.bg}; border: 1px solid {onlySty.border}; border-radius: 3px; padding: 2px 8px; color: {onlySty.color}; font-size: 11px; font-weight: 700; letter-spacing: 0.04em;"
              >{onlySty.label}</span
            >
            <span style="font-size: 11px; color: #737373;">Locked - this raid only offers one difficulty.</span>
          </div>
        </div>
      {:else if availableDifficulties.length > 1}
        <div style="margin-bottom: 14px;">
          <div class="field-label">Difficulties</div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px;">
            {#each DIFFICULTY_ORDER.filter((d) => availableDifficulties.includes(d)) as d}
              {@const sty = DIFFICULTY_STYLE[d]}
              <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 12px;">
                <input
                  type="checkbox"
                  checked={form.difficulties.includes(d)}
                  onchange={(e) => {
                    const set = new Set(form.difficulties);
                    if ((e.target as HTMLInputElement).checked) set.add(d);
                    else set.delete(d);
                    form.difficulties = DIFFICULTY_ORDER.filter((x) => set.has(x));
                  }}
                  style="accent-color: {sty.color}; width: 13px; height: 13px;"
                />
                <span
                  style="background: {sty.bg}; border: 1px solid {sty.border}; border-radius: 3px; padding: 1px 6px; color: {sty.color}; font-size: 10px; font-weight: 700; letter-spacing: 0.04em;"
                  >{sty.label}</span
                >
              </label>
            {/each}
          </div>
          <div style="font-size: 11px; color: #525252; margin-top: 4px;">
            Leave all unchecked = mechanic applies to every difficulty.
          </div>
        </div>
      {/if}

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
    <div
      style="padding: 12px 18px; border-top: 1px solid #262626; display: flex; align-items: center; justify-content: flex-end; gap: 8px;"
    >
      {#if sourceLabel}
        <span
          title="Where this mechanic's HP/timer data came from."
          style="margin-right: auto; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #737373;"
        >
          <span style="width: 6px; height: 6px; border-radius: 50%; background: {sourceLabel.dot};"></span>
          Source: {sourceLabel.text}
        </span>
      {/if}
      <button
        onclick={onClose}
        style="background: #262626; border: 1px solid #262626; border-radius: 4px; padding: 7px 14px; color: #a3a3a3; cursor: pointer; font-size: 12.5px; font-family: inherit;"
        >Cancel</button
      >
      <button
        onclick={save}
        disabled={!isValid}
        style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); border-radius: 4px; padding: 7px 14px; color: #38bdf8; cursor: {isValid
          ? 'pointer'
          : 'not-allowed'}; font-size: 12.5px; font-weight: 600; opacity: {isValid ? 1 : 0.5}; font-family: inherit;"
        >{isEdit ? "Save" : "Add"}</button
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
  .req-asterisk {
    color: #f87171;
    margin-left: 4px;
  }
</style>

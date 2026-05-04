<script lang="ts">
  import { getCurrentWebviewWindow, WebviewWindow } from "@tauri-apps/api/webviewWindow";

  let { clickThrough }: { clickThrough: boolean } = $props();

  async function openSettings() {
    const win = await WebviewWindow.getByLabel("settings");
    if (win) {
      await win.show();
      await win.setFocus();
    }
  }

  async function hideOverlay() {
    await getCurrentWebviewWindow().hide();
  }
</script>

{#if !clickThrough}
  <!-- Window bounds outline — helps user see invisible hit area while positioning -->
  <div
    style="position: fixed; inset: 0; border: 1px dashed rgba(148,163,184,0.2); border-radius: 6px; pointer-events: none;"
  ></div>

  <!-- Corner controls -->
  <div style="position: fixed; top: 8px; right: 8px; display: flex; gap: 4px; z-index: 100;">
    <!-- Settings -->
    <button
      onclick={openSettings}
      title="Open Settings"
      style="width: 22px; height: 22px; background: rgba(15,23,42,0.88); border: 1px solid rgba(100,116,139,0.35); border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#94a3b8"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        />
      </svg>
    </button>

    <!-- Minimize (hide overlay) -->
    <button
      onclick={hideOverlay}
      title="Hide Overlay"
      style="width: 22px; height: 22px; background: rgba(15,23,42,0.88); border: 1px solid rgba(100,116,139,0.35); border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#94a3b8"
        stroke-width="2.5"
        stroke-linecap="round"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  </div>
{/if}

<script lang="ts">
  import { openUrl } from "@tauri-apps/plugin-opener";

  const HUB_URL = "https://shotgun175.github.io/";

  // Desktop webview: a plain target="_blank" can't reach the system browser, so
  // route the click through the Tauri opener plugin (permission: opener:allow-open-url).
  function openHub(e: MouseEvent) {
    e.preventDefault();
    openUrl(HUB_URL).catch((err) => console.warn("could not open hub link", err));
  }
</script>

<a
  href={HUB_URL}
  onclick={openHub}
  aria-label="Part of Lost Ark Tools - opens the Lost Ark Tools hub in your browser"
  class="hub-badge"
>
  <span class="hub-badge__dot" aria-hidden="true"></span>
  Part of Lost Ark Tools
</a>

<style>
  .hub-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid #404040;
    border-radius: 8px;
    background: #1f1f1f;
    color: #d4d4d4;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition:
      background 0.15s,
      border-color 0.15s,
      color 0.15s;
  }
  .hub-badge:hover {
    background: #262626;
    border-color: var(--color-accent-500, #38bdf8);
    color: #fafafa;
  }
  .hub-badge:focus-visible {
    outline: 2px solid var(--color-accent-500, #38bdf8);
    outline-offset: 2px;
  }
  .hub-badge__dot {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--color-accent-500, #38bdf8);
  }
</style>

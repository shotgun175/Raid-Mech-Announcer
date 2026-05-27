<script lang="ts">
  // Brief celebratory banner shown on the overlay when a boss is killed.
  // "boss-defeated" on a non-final gate; "raid-cleared" on the final gate of a raid.
  // Styled to match the overlay's glass-panel idiom (see OLCombined.svelte).
  type Variant = "boss-defeated" | "raid-cleared";
  let { variant = "boss-defeated" }: { variant?: Variant } = $props();

  const config = {
    "boss-defeated": { color: "#34d399", pill: "Dead", text: "Boss Defeated" },
    "raid-cleared": { color: "#34d399", pill: "Clear", text: "Raid Cleared" }
  } as const;

  const c = $derived(config[variant]);
</script>

<div
  style="display: flex; align-items: center; gap: 10px; width: 400px; font-family: Inter, sans-serif;
    background: rgba(10,10,10,0.9); backdrop-filter: blur(12px);
    border: 1px solid {c.color}66; border-left: 3px solid {c.color}; border-radius: 0 5px 5px 0;
    padding: 12px 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 28px {c.color}33;"
>
  <span
    style="width: 7px; height: 7px; border-radius: 50%; background: {c.color}; flex-shrink: 0;
      box-shadow: 0 0 8px {c.color}; animation: mech-pulse 1.4s infinite;"
  ></span>
  <span
    style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: {c.color};
      text-transform: uppercase; background: {c.color}1f; border: 1px solid {c.color}47;
      border-radius: 3px; padding: 2px 6px; flex-shrink: 0;">{c.pill}</span
  >
  <span style="font-size: 16px; font-weight: 700; color: #fafafa; letter-spacing: -0.01em;">{c.text}</span>
</div>

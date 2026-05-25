# Raid Mech Announcer

A transparent always-on-top overlay for Lost Ark that announces raid mechanics based on boss HP bars. Built on top of [LOA Logs](https://github.com/snoww/loa-logs) for live data, with a full raid mechanic editor and TTS/Discord webhook support.

> **Requires LOA Logs to be installed.** The app reads game data from LOA Logs' meter-data directory and receives live boss HP via PeerJS share.

## Features

- **Mech Overlay** — transparent window that announces upcoming mechanics as HP bars tick down, with 5 overlay variants (Pill, Compact, HUD Strip, Card Stack, Combined)
- **Raid Editor** — build and manage mechanic patterns per raid gate, with live HP timeline visualization
- **Pre-built Library** — 48 gates across 18 raid groups with notes sourced from Maxroll guides
- **TTS Announcements** — Windows SAPI voices (Andrew/Jenny) with volume control
- **Discord Webhooks** — post mechanic announcements as embeds to a Discord channel
- **Auto Show/Hide** — overlay appears when a matching boss is detected and hides when the encounter ends
- **PeerJS Integration** — receive live boss HP directly from LOA Logs' share URL

## Requirements

- Windows 10/11
- [LOA Logs](https://github.com/snoww/loa-logs/releases) installed
- [Microsoft Edge WebView2 Runtime](https://go.microsoft.com/fwlink/p/?LinkId=2124703)
- Node.js ≥ 24.0.0 (for development)
- Rust ≥ 1.90 / `rustup update stable` (for development)

## Usage

1. Install and launch **LOA Logs** — Raid Mech Announcer reads its meter-data on startup
2. Launch **Raid Mech Announcer** — the overlay appears in preview mode so you can position it
3. In LOA Logs, click the **share** button to get a PeerJS URL, then paste it into the connection bar at the bottom of the app
4. Enter a raid — the overlay auto-matches the boss and starts announcing mechanics

## Development

```bash
npm install              # install JS deps
npm run setup:python     # install edge-tts voices (Andrew/Jenny)
npm run tauri:dev        # full desktop app (requires Rust >= 1.90)
npm run check            # TypeScript validation
npm run lint             # Prettier check
npm run format           # Prettier fix
```

> **Note:** Live packet capture requires the private `meter-core-rs` crate. Dev builds use `meter-core-stub` — mechanic announcements still work via the PeerJS connection; only direct packet capture is unavailable.

## Overlay Variants

| Variant | Description |
|---|---|
| **Pill** | Single next-mechanic pill — minimal footprint |
| **Compact** | Upcoming mechanics list with HP bar indicators |
| **HUD Strip** | Full-width horizontal strip |
| **Card Stack** | Stacked cards for each upcoming mechanic |
| **Combined** | HP timeline + upcoming mechanics |

## WinDivert

This app uses WinDivert for packet capture (same as LOA Logs). The `WinDivert.dll` and `WinDivert64.sys` files are compiled into the binary and extracted on first run. If your antivirus quarantines them, add a folder exception for the install directory.

**NordVPN users:** NordVPN also uses WinDivert. Both apps cannot run simultaneously.

## Credits

Forked from [LOA Logs](https://github.com/snoww/loa-logs) by [Snow](https://github.com/snoww) and contributors. The packet capture core, game data tables, and base architecture come from that project.

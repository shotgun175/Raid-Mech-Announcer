# Raid Mech Announcer

Part of [Lost Ark Tools](https://shotgun175.github.io/).

A transparent always-on-top overlay for Lost Ark that announces raid mechanics based on boss HP bars. Built on top of [LOA Logs](https://github.com/snoww/loa-logs) for live data, with a full raid mechanic editor and TTS/Discord webhook support.

> **Requires LOA Logs to be installed.** The app reads game data from LOA Logs' meter-data directory and receives live boss HP via PeerJS share.

## Features

- **Mech Overlay** — transparent window that announces upcoming mechanics as HP bars tick down, with 5 overlay variants (Pill, Compact, HUD Strip, Card Stack, Combined)
- **Raid Editor** — build and manage mechanic patterns per raid gate, with live HP timeline visualization
- **Pre-built Library** — 42 gates across 16 raid groups with notes sourced from Maxroll guides
- **TTS Announcements** — edge-tts neural voices (Andrew/Jenny) with Windows SAPI as the last-resort fallback; volume and rate control
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
   - Convenience: while disconnected, the app polls the clipboard once per second and auto-connects when it sees a copied LOA Logs share URL. The clipboard is only pattern-matched for that URL, never stored or sent anywhere.
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

## Assumptions, scope, and open questions

A few design decisions and boundaries are easy to trip over when reading the code or contributing data, so they are collected here.

### Assumptions

- **LOA Logs is installed and running.** The app reads game data tables from LOA Logs' `meter-data` directory at startup and refuses to start without them. Live boss HP arrives over the PeerJS share URL you paste in; LOA Logs exposes no local server or API to poll (the port in its `settings.json` is a packet-capture setting, not a server port).
- **Windows only.** Packet capture (WinDivert), the WebView2 UI shell, and TTS all assume Windows.
- **Mechanic data is curated from community guides.** The pre-built library is sourced primarily from Maxroll cheat sheets. Mechanic names favor the shorthand players call in party chat, since TTS reads them aloud mid-fight.

### Scope

- **This is a mechanic announcer, not a damage meter.** It reuses LOA Logs' packet-capture and encounter-detection plumbing only to drive HP-based announcements. There is no DPS readout or combat-metering UI, by design.
- **Boss HP bar counts (`totalBars`) are deliberately hand-curated, not pulled from the game tables.** Each gate's `totalBars` comes from the `bossHpMap` at the top of `src/lib/data/raid-library.ts`, not from the raw `hpBars` value in `Npc.json`. This is intentional: the curated numbers place the editor's HP simulation slider near the first real mechanic threshold, so the preview is useful immediately instead of starting far above where anything happens. Do not "fix" these by syncing them to `Npc.json`.
- **Where the real numbers live, if you need them.** The authoritative HP bar count for a boss is the `hpBars` field in `Npc.json` (under `src-tauri/meter-data/`, from the upstream LOA Logs repo) for the entry with `grade: "commander"`. Other entries for the same name are phase variants with `hpBars: 1`. Cross-reference `encounters.json` for the correct raid entry, then translate to a curated `bossHpMap` value rather than copying the raw count directly.

### Open questions / known limits

- **Coverage is intentionally partial.** The library covers the 42 standard raid gates. Rotating or weekly modes (such as Howl's Hourglass) are out of scope and will correctly produce no overlay match.
- **HP thresholds are best-effort.** They approximate community-guide values and can drift slightly between patches. Bosses that rename mid-fight (phase transitions) are handled by sticky gate matching so the overlay does not flip raids on a rename.

## Credits

Forked from [LOA Logs](https://github.com/snoww/loa-logs) by [Snow](https://github.com/snoww) and contributors. The packet capture core, game data tables, and base architecture come from that project.

---

> Raid Mech Announcer is a fan-made tool. It is not affiliated with, endorsed by, or
> sponsored by Smilegate RPG or Amazon Games. "Lost Ark" and related marks belong to
> their respective owners.

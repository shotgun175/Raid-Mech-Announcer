---
glob: src/**
---

# Svelte Frontend Rules

## Svelte 5 Runes (mandatory)
- Use `$state()`, `$derived()`, `$effect()`, `$props()` — never legacy `writable`/`readable` stores or `$:` reactive statements
- State modules use `.svelte.ts` extension; pure utilities use `.ts`

## Types
- All shared interfaces and enums live in `src/lib/types.ts` — import from there, never redeclare locally
- Use TypeScript strict mode; no `any` unless interfacing with untyped external data

## Tauri Bridge
- All `invoke()` calls go through `src/lib/api.ts` — do not call `invoke()` directly inside components
- Event listeners (game state, encounter updates) are set up in `src/lib/utils/live.svelte.ts`

## Components
- PascalCase filenames (`PlayerRow.svelte`, `BuffHeader.svelte`)
- Keep components focused; extract to `src/lib/components/` when reused across routes
- Tooltips live in `src/lib/components/tooltips/`

## Styling
- TailwindCSS utility classes inline — no per-component `<style>` blocks unless unavoidable
- Global styles only in `src/app.css`
- Line length ≤ 120 chars, CRLF endings (Prettier enforced)

## Routes
- `(live)/live/` renders the transparent always-on-top overlay — keep it lightweight, no heavy computations
- `(mini)/mini/` is the compact overlay — minimal DOM, performance-sensitive
- `(app)/` is the standard windowed UI — full features allowed

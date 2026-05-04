---
glob: src/**
---

# Svelte Frontend Rules

## Svelte 5 Runes (mandatory)
- Use `$state()`, `$derived()`, `$effect()`, `$props()` — never legacy `writable`/`readable` stores or `$:` reactive statements
- State modules use `.svelte.ts` extension; pure utilities use `.ts`

## Types
- Mech-specific interfaces in `src/lib/mech-types.ts`; app/settings types in `src/lib/settings.ts`
- Use TypeScript strict mode; no `any` unless interfacing with untyped external data

## Tauri Bridge
- All `invoke()` calls go through `src/lib/api.ts` — do not call `invoke()` directly inside components
- Exception: `src/lib/utils/tts.ts` has a justified browser speechSynthesis fallback for dev mode

## Components
- PascalCase filenames (`MechRow.svelte`, `OverlayControls.svelte`)
- Keep components focused; extract to `src/lib/components/` when reused across routes
- Overlay variant components live in `src/lib/components/mech/overlays/`

## Styling
- TailwindCSS utility classes inline — no per-component `<style>` blocks unless unavoidable
- Global styles only in `src/app.css`
- Overlay components may use inline `style=""` strings (transparent window context, no Tailwind reset)
- Line length ≤ 120 chars, CRLF endings (Prettier enforced)

## Routes
- `(app)/` is the standard windowed settings/editor UI — full features allowed
- `(mech)/mech-overlay/` renders the transparent always-on-top overlay — keep it lightweight

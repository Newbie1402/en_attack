# SnowGraph visual overhaul report

Date: 2026-11-28
Branch: `feat/visual-overhaul-polish`

## Before → after

The baseline was a functional vertical slice with a flat green board, global website chrome, primitive
runtime shapes and raw debug-style lifecycle copy. The overhaul keeps the deterministic simulation and
rebuilds the gameplay presentation around a dedicated game viewport:

| Area | Baseline | Current first pass |
|---|---|---|
| Gameplay composition | Website shell around the board | Compact HUD, unit rail, dominant battlefield and bottom Trajectory Lab |
| Mascot and enemies | Primitive Phaser geometry | Local original SVG swallow, fox, boar, raven, guardian and nest assets |
| Environment | Flat grid | Spring/winter palettes, local backdrop, fence, flowers/snow and tile depth |
| Combat feedback | Projectile and state changes were easy to miss | Snowball sprite, trail, hit flash, damage number and throw recoil |
| Economy feedback | Pickup state was not player-readable | Visible nest-produced pickup, pickup-first selection and HUD collection flight |
| Formula interaction | Single raw input | Game-themed lab, selected-origin copy, parser-compatible shortcut strip |
| Lifecycle | Technical pause/result state | Player-facing pause label, result overlay, retry/map actions and stale-feedback clearing |

## Evidence

Before screenshots: `artifacts/visual-qa/before/gameplay-1440.png` and
`artifacts/visual-qa/before/gameplay-1280.png`.

After screenshots: `artifacts/visual-qa/after/gameplay-1920x1080.png`,
`gameplay-1440x900.png`, `gameplay-1366x768.png`, `gameplay-1280x720.png`,
`winter-1440x900.png` and `lucky-nest-pickup-1440x900.png`.

The browser suite captured the after images from the running app. It also checked that the four desktop
viewports have no page scroll, the winter route uses its distinct palette, and a real nest production
cycle credits energy only after the visible pickup is clicked.

## Honest boundary

This is the first complete visual/gameplay polish slice, not the final art pass. Final commissioned
atlases, audio, complete animation state coverage, richer reward metrics, CSP/security audit and measured
performance profiling are still open in `.codex/17-POLISH-PROGRESS.md`.

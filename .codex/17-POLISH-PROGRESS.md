# SnowGraph polish progress

Status: V00–V03 pass, V04–V09 partial and still open at their full visual/lifecycle gates. Work is on
`feat/visual-overhaul-polish`.

| Phase | Status | Evidence / blocker |
|---|---|---|
| V00 Audit | PASS | Existing app, code paths, tests, baseline screenshots and reference direction inspected. |
| V01 Layout | PASS | Fixed desktop game viewport, HUD/rail/stage/lab composition, no-scroll assertions and captures at 1920×1080, 1440×900, 1366×768 and 1280×720. |
| V02 Assets | PASS (first pass) | Original local SVG swallows, enemies, boss, nest, pickups, projectile and seasonal backdrops loaded through Phaser; manifest complete for this slice. Final commissioned atlases/audio remain open. |
| V03 Seasonal board | PASS (first pass) | Spring and winter render with distinct local backdrops, tile palettes, fence/snow/flower detail and unchanged square coordinate transforms. |
| V04 Swallow animation | IN PROGRESS | Deterministic idle bob, selection, cooldown opacity and event-owned throw recoil exist; full idle/blink/wing/anticipation/recovery/celebration states remain. |
| V05 Nest/pickups | IN PROGRESS | Real nest production, visible pickup, pickup-first hit testing, idempotent collection and collection flight are covered by a 10-second browser test; full egg lifecycle and skill-type visuals remain. |
| V06 Combat feel | IN PROGRESS | Local snowball sprite, trail, hit flash and damage numbers are wired to simulation events; defeat/boost/freeze effects and audio remain. |
| V07 Enemy animation | IN PROGRESS | Distinct local fox/boar/raven/guardian silhouettes and lightweight motion are live; dedicated walk/armor/lane-transition/phase animations remain. |
| V08 Formula UX | IN PROGRESS | Game-themed lab, selected-origin copy, recent formula strip and math shortcut buttons are live; full formula history reuse/reset UI remains. |
| V09 Lifecycle screens | IN PROGRESS | Player-facing pause label, result overlay, retry/map actions and stale-feedback clearing are live; intro/wave announcements, stars and detailed result metrics remain. |
| V10 Menu/campaign/audio | NOT STARTED | — |
| V11 Performance/QA | NOT STARTED | — |

## 2026-11-28 — V00 audit — PASS

- Inputs read: user overhaul brief, existing `AGENTS.md`, `SUPER_PROMPT.md`, `.codex/01`–`.codex/11`,
  and all three supplied reference PNGs.
- Existing baseline: `npm run verify` passed before this branch; prior browser suite passed 7 Chromium
  tests. Existing real screenshots were visually inspected and copied to `artifacts/visual-qa/before/`.
- Findings: gameplay behavior is a sound base; the main blockers are viewport composition, primitive
  presentation, missing event feedback, and raw lifecycle copy.
- At the V00 checkpoint, next exact task was to complete V01 layout and load independent local SVG assets
  without changing simulation contracts; that task is evidenced below.

## 2026-11-28 — V01–V03 and first game-feel slice — PASS / IN PROGRESS

- Changes: gameplay route now uses a fixed desktop viewport with a compact HUD, left unit rail, dominant
  battlefield and bottom Trajectory Lab. Global website navigation is removed from the gameplay route.
  Formula shortcuts insert parser-compatible tokens without stealing text-input shortcuts. Result copy is
  player-facing and stale feedback clears on match end/retry.
- Assets: added original local SVG assets under `public/assets/characters`, `environments`, `pickups` and
  `projectiles`; Phaser loads them independently from simulation state. Spring and winter backdrop assets
  sit behind the square board; character/enemy sprites replace the primitive runtime draw path.
- Game feel: event-owned throw recoil, enemy hit flash, damage numbers, projectile trail and pickup flight
  toward the HUD were added. Pointer hit testing gives a visible pickup priority over its owning nest.
- Verification: `npm run verify` exit 0 (lint, format check, strict typecheck, 26 unit tests, production
  build); `npm run test:e2e` exit 0 (9 Chromium tests). Targeted pickup test waited through a real nest
  production cycle, asserted no auto-credit, clicked the canvas, and observed energy 150 → 175 exactly once.
  Targeted visual test passed both spring/winter routes and no-scroll checks. Browser output contains only
  existing React Router future-flag warnings.
- Visual evidence inspected: `artifacts/visual-qa/after/gameplay-1920x1080.png`, `gameplay-1440x900.png`,
  `gameplay-1366x768.png`, `gameplay-1280x720.png`, `winter-1440x900.png`, and
  `lucky-nest-pickup-1440x900.png`; baseline remains in `artifacts/visual-qa/before/`.
- Known limitations: assets are first-pass original SVG illustrations rather than final sprite atlases;
  audio, full animation state coverage, detailed lifecycle reward screens, performance profiling and
  CSP/security audit remain unverified. The production bundle still emits the known Phaser >500 kB warning.
- Final verification rerun after the pickup hit-test fix: `npm run verify` exit 0; `npm run test:e2e` exit 0
  with 9 Chromium tests. The build warning and existing React Router future-flag warnings remain non-blocking.
- Next exact task: finish the remaining event animation states and lifecycle/reward screens, then run the
  visual QA matrix and measured performance pass.

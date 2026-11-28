# Codex task — integrate Pack 01 v1 into the existing SnowGraph repository

Act as Lead Engineer and QA. Read AGENTS.md, current `.codex` specs, runtime manifest schema and `.codex/34-PACK01-SWALLOW-HANDOFF.md`. This pack contains actual PNG files. Treat it as an additive art patch, not a replacement project. Preserve gameplay and existing assets. No commit/push/deploy without authorization.

## Input

- Pack 01 PNGs under `public/assets/characters/swallows/`.
- `integration/pack01-manifest.json` (proposal; reconcile, not overwrite).
- Current game, existing tests, approved concept and asset documentation.

## Implement

1. Audit current asset IDs/paths, variant keys, preload adapter and texture usage; record exact mapping. Copy PNG files, handle conflicts intentionally, preserve existing fallbacks. Keep reference files out of public assets.
2. Merge manifest entries into the existing validated schema, including exact frame dimensions, 0–3 pose mapping, anchor, derived portrait and provenance. Set production status to needs-revision until QA. Validate file paths and Vite base support.
3. Replace actual board placeholder rendering with sheet sprites for all three variants and shop/HUD with portrait. Keep visual shadow/selection separate. Do not create a new engine or rewrite formula rules. Use existing authoritative cell origin/hitbox. Use a shared sprite sizing helper. Start with canvas height 1.02 tile and ground anchor from manifest; visually tune if required.
4. Map domain attack windup → pose 1, actual projectile emission → pose 2, cosmetic recovery → pose 3, then pose 0; idle tween optional. Do not create projectiles/damage from render callbacks. Handle cancel, pause, fast-forward, level end, removal, scene restart. Use one texture key per variant. If events are missing, add minimal render events without changing simulation semantics. No per-unit unmanaged interval. Preserve automatic attacks, formula assignment exclusivity, boss historical limits and placement/relocation. Ensure held snowball disappears on emission and no duplicate snowball appears.
5. Run actual tests and browser. Capture before/after screenshots in `artifacts/visual-qa/pack01/` at 1440×900 and 1280×720; capture all three on grass and snow; active auto attack, shop, placement, victory. Compare with `references/pack01-contact-sheet.jpg` and approved concept. Record video/trace if available. Report no-video limitations instead of faking.
6. Update existing asset inventory, animation spec and progress with exact changes, IDs, paths, checks, remaining issues. Do not mark a 1-pose clip as multi-frame animation. Record asset rights review pending.

## Verify and exit gate

Discover commands from package.json; run applicable lint, typecheck, unit tests, E2E and build. Add asset registry tests for variant paths and frame metadata, and rendering integration tests for attack event mapping, restart and texture availability. Confirm multiple independently auto-attacking swallows use different assigned formulas as previously designed; no regression in trajectory origin, damage or cadence. Confirm no unexpected 404, texture error or listeners/tween leak. Inspect screenshots rather than just recording them. Capture actual dimensions and any foot jitter. If any gate fails, do not claim production quality.

## Return to Art Director

Return the exact runtime manifest entries, changed file paths, test commands/results, before/after screenshot(s) or clip, tilePx and display scale, any rendering defects (pose, variant, severity) and your recommended next pack. Report blockers explicitly. Continue with non-blocked tasks; do not substitute geometry and call it finished.

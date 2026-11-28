# SnowGraph Art Director → Codex: runtime delivery 01–06

Status: offline-validated runtime candidates / partial content, not production final. Extract this ZIP at repository root. All paths start with public/, integration/, .codex/, or references/ (plus Pack01 README). Keep existing AGENTS and specs; review merge before overwriting docs. Runtime files are separate binaries, not concept screenshots. Reference images are not runtime textures. Do not copy any unrelated generated poster into the game.

## Order and acceptance

1. Pack01: merge proposed manifest, use three 4-frame 1024×256 sheets and 192×192 portraits. Map to existing enum IDs; avoid loading standalone poses redundantly. Validate anchor (120/256,236/256). Record pose jitter, shop and active auto-attack screenshots. No new combat timing.
2. Pack02: merge six distinct enemy textures and portraits; visual-only move/hit/defeat tweens. Armor baked in art, not separable; show actual independent health/armor bars and VFX. Do not show armor removed unless proper separate artwork exists.
3. Pack03: replace flat grass with independent texture tiles; test deterministic cosmetic variants at actual cell size and square world transform. Scenic strips are optional mixed-season crops, not distinct full backdrops. Keep unfinished props behind a review gate. Do not change board topology or introduce decoration collision.
4. Pack04: map nest and pickup IDs to existing domain, use independent sprites/overlays; collection, spawn, expiry and inventory remain authoritative. Optional relocate icon only if mechanic exists. QA idempotency and lifecycle.
5. Pack05: load separate 128px projectile sprites and 6-frame VFX sheets; play on authoritative events, pool effects as needed. Preview and projectiles retain domain coordinates. Do not alter radius/damage/formulas.
6. Pack06: integrate 9-slice frames and original synthesized WAVs where useful. Use real DOM/game text, focus states and licensed fonts from existing repo. Respect browser audio unlock, separate SFX/music volume. Music is a sketch, not final soundtrack.

## Integration gates

- Read all pack handoffs and per-pack tasks/manifests in integration/. Map supplied IDs into current validated runtime manifest; do not replace runtime schema or unrelated assets. URLs must respect Vite base. No changes to simulation trajectory/formula/ownership/cooldown unless owner approves design change.
- Verify all runtime texture paths and file count. `npm run verify` (discover actual commands if changed). Report exact output. Run browser actual screenshots at 1280x720 and 1440x900; capture shop, placement, each bird/enemy, active wave, pickup creation/collection, armor hit, freeze, pause/restart and victory. Capture short recordings of combat/pickup when possible. Inspect before/after screenshot against approved concept. Measure frame times and memory under concurrent attacks. No test claims without evidence.
- Keep fallback for load failures, log missing keys; production art gate fails if fallback is normal render path. No fake frame cycles or animation-driven gameplay events.
- Store evidence at artifacts/visual-qa/pack01 through pack06. Return actual runtime manifest, code paths, tile size, sprite scale/pivot, test logs, screenshots, issues by asset ID and requested corrections. No commit/push/deploy absent authorization.

## Open art blockers / next revision

- Pack01 true multi-frame idle/blink/charge/release/recovery; feet anchor and jitter in motion.
- Pack02 multi-frame walking/flying and armor-free sprites/armor overlays, additional enemies/boss.
- Pack03 distinct illustrated spring/winter backgrounds and modular trees, fences, snowbanks, transitions; current texture crops low native resolution, not seamless guaranteed. Both scenic strips share source. Flower prop optional, inspect edge.
- Pack04 true independent egg/nest states, high-res clean medallion art; crack/shell and relocation are technical drawings, not final hand illustration.
- Pack05 richer hand-illustrated effects, distinct heavy art; current effects technical authored frame sequences, not final art.
- Pack06 complete illustrated HUD/shop/result panels, licensed Vietnamese font selection, refined soundtrack/mix. Synth audio not auditioned.
- Independent art generation for terrain failed twice (returned unrelated posters); those images intentionally excluded. We used clean reference-derived crops and technical authored files as an interim handoff, not approval of production art.
- Rights review for owner-supplied mascot and approved concept derivatives before public release. Current repository inaccessible to Art Director; runtime acceptance requires Codex evidence.

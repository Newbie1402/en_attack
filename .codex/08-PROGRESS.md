# 08 — Progress / checkpoint

Status: Phases 00–03 are complete. Phases 04–07 and 09 are implemented in part and remain open at
their full exit gates. Phase 08 visual approval, Phase 10 QA sign-off and Phase 11 release packaging
are not claimed. Reference PNGs were inspected visually and remain outside runtime assets.

| Phase | Status | Evidence |
|---|---|---|
| 00 Foundation | PASS | 2026-11-28: Vite/React/TS app, Phaser lifecycle canvas, route smoke, Zod boundary contract, scripts, CI and lockfile implemented. `npm ci` exit 0; `npm run lint` exit 0; `npm run format:check` exit 0; `npm run typecheck` exit 0; `npm test` exit 0 (1 file / 2 tests); `npm run build` exit 0; `npm run test:e2e -- smoke` exit 0 (1 passed in Chromium). Build emitted a non-blocking large Phaser chunk warning. `npm ci` reported 3 high npm audit findings for later security review. |
| 01 Math | PASS | 2026-11-28: allowlisted math.js AST -> immutable IR, bounded evaluator, origin/domain validation, adaptive sampler, canonical polynomial aliases and behavioral quota registry. `npm test -- math` exit 0 (8 tests); full `npm run verify` exit 0. |
| 02 Simulation | PASS | 2026-11-28: pure board transforms, immutable fixed-step state, typed commands/events, deterministic occupancy, sampled projectile sweep, moving enemy/obstacle contacts, hearts, pause and replay. `npm test -- simulation` exit 0 (6 tests); full `npm run verify` exit 0. |
| 03 Vertical slice | PASS | 2026-11-28: GameSession RAF owner, Phaser battlefield renderer, React formula HUD/Start/Fire/Retry bridge, real L1 test wave and procedural swallow/enemy/board art. `npm run test:e2e` exit 0 (smoke + gameplay, 2 passed); real screenshots at `docs/screenshots/vertical-slice-1440.png` and `vertical-slice-1280.png`; `npm run verify` exit 0. |
| 04 Economy | IN PROGRESS | Headless economy fixtures and browser shop gate pass; move-mode UX and full pickup animation acceptance remain. |
| 05 Skills | IN PROGRESS | Headless skill fixtures and browser activation gate pass; active-timer/drop-pity presentation remains. |
| 06 Waves | IN PROGRESS | Authored L1–L4 configs, wave fixtures and browser clock gate pass; reproducible six-level win/loss scripts remain. |
| 07 Boss | IN PROGRESS | Quota/boss fixtures and L6 browser route gate pass; complete browser strategy/threshold acceptance remains. |
| 08 Art | NOT STARTED | — |
| 09 Campaign | IN PROGRESS | Versioned save, unlock-on-win wiring, sandbox, bestiary and settings routes pass unit/browser checks; full campaign replay proof remains. |
| 10 QA | NOT STARTED | — |
| 11 Release | NOT STARTED | — |

## Append for each execution
- Date, phase, status (IN PROGRESS / PASS / BLOCKED), scope and changes.
- Inputs/specs read; decisions/ADR IDs.
- Commands actually run + exit status and key output; screenshots/test report paths.
- Acceptance IDs verified; failed/skipped checks and reason.
- Known limitations, asset status, next exact task; no false green.

## 2026-11-28 — Phase 00 Foundation — PASS

- Inputs: `AGENTS.md`, `SUPER_PROMPT.md`, `.codex/01`–`.codex/11`, and all three reference PNGs.
- Scope: establish the Vite/React/strict TypeScript application boundary, Phaser mount/dispose smoke,
  routes, Tailwind entry, Zustand/Zod/math.js dependency baseline, tests, CI and README.
- Changes: added `package.json`/`package-lock.json`, Vite/TypeScript/ESLint/Prettier/Vitest/Playwright
  configs, route shell, local procedural garden/bird art, Phaser foundation scene, Zod level contract,
  unit/e2e smoke tests, CI and `README.md`.
- Decisions: D13 records the pinned dependency baseline; D14 records the foundation's framework split.
- Evidence: `npm ci` 0; `npm run lint` 0; `npm run format:check` 0; `npm run typecheck` 0;
  `npm test` 0 (2 tests); `npm run build` 0; `npm run test:e2e -- smoke` 0 (1 Chromium test).
- Acceptance: Phase 00 app boot, route skeleton, one Phaser canvas, strict checks and browser smoke passed.
- Known limitations: combat/editor remain Phase 01–03 work; npm audit reports 3 high findings; build warns
  about Phaser's initial chunk size; visual concept-fidelity review is not yet a Phase 08 gate.
- Next exact task: implement Phase 04 nest production, collectible pickup lifecycle and unit shop/move HUD.

## 2026-11-28 — Phases 01–03 — PASS

- Phase 01 inputs: `.codex/02-MATH-ENGINE.md`, foundation and M01–M04 fixtures. Changes: parser
  preflight bounds, math.js parse-only allowlist, immutable expression IR, finite evaluator, shared
  trajectory sampler, canonical polynomial aliases, behavioral matching and immutable bucket registry.
  Acceptance: M01–M04 and Q01-style alias/domain tests pass (8 math tests).
- Phase 02 inputs: phase 01 engine and `.codex/03-ARCHITECTURE.md` tick/collision contract. Changes:
  board world/screen transform, config-driven unit/enemy balance, command/event simulation, swept
  projectile contacts, obstacle ordering, breach/hearts and deterministic replay. Acceptance: C01/C03,
  E01/E02 and W01-style headless fixtures pass (6 simulation tests).
- Phase 03 inputs: phase 02 simulation and `.codex/04-UI-ART-DIRECTION.md`. Changes: fixed-step
  `GameSession`, Phaser presentation, React HUD/editor bridge, L1 one-wave start/fire/retry flow and
  original local vector/procedural garden art. Acceptance: gameplay Playwright flow passed, one canvas
  asserted, screenshots manually inspected at 1440×900 and 1280×720.
- Commands actually run: `npm ci` 0; `npm run verify` 0 (lint, format, typecheck, 16 Vitest tests,
  production build); `npm run test:e2e` 0 (2 Chromium tests). Build still reports a non-blocking Phaser
  chunk-size warning. No fake win or static screenshot is used as gameplay.
- At the Phase 00 checkpoint, economy, skills, authored waves, boss, save/settings and final art/audio
  were not implemented yet. Current procedural art is a foundation style pass, not final Phase 08 concept approval.
- Next exact task: implement Phase 04 nest production, collectible pickup lifecycle and unit shop/move HUD.

## 2026-11-28 — Economy, tactics, waves, boss and campaign continuation — IN PROGRESS

- Inputs: existing Phase 01–03 implementation plus `.codex/01`–`.codex/11`; no new owner decisions.
- Scope: expose the already-built economy/skill/wave/boss domain through targeted browser gates; add
  versioned bounded local save recovery and next-level unlock wiring; replace sandbox, bestiary and
  settings placeholders with small working routes; add original local SVG lab preview and route tests.
- Changes: added `src/game/application/save.ts` with Zod validation and immutable win progression,
  `save.test.ts`, `SettingsPage`, `SandboxPage`, `BestiaryPage`, campaign save-aware links, match-win
  persistence, and responsive styles. Added campaign/route and phase-gate Playwright coverage.
- Decisions: D17 records the bounded local save format; D18 records sandbox reuse of the math engine
  without campaign side effects; D19 records the current art gate remains open.
- Evidence already run: `npm test` exit 0 (8 files / 26 tests); `npm run test:e2e` exit 0 (7 Chromium
  tests, including economy, skills, waves, boss route, campaign, sandbox, settings and gameplay).
  Browser output includes only React Router future-flag warnings. Latest screenshots remain at
  `docs/screenshots/vertical-slice-1440.png` and `docs/screenshots/vertical-slice-1280.png`.
- Final code gate: `npm run verify` exit 0 (lint, format check, strict typecheck, 26 Vitest tests and
  production build). Build still emits the non-blocking Phaser bundle-size warning.
- Acceptance verified: malformed local save recovers; L1 win unlocks L2 in pure logic; shop and skill
  controls observe running/energy state; authored waves start through the fixed clock; L6 exposes its
  tactical route; sandbox uses the same validator/sampler; settings survive reload.
- Not claimed: move-mode UI, complete pickup animation/drop-pity presentation, six-level solvability
  scripts, final sprite/audio asset review, 10-minute profiling, CSP production smoke, Docker image or
  release-candidate status. Npm audit still reports high findings and the Phaser bundle warning remains.
- Next exact task: finish Phase 04–07 interaction details and reproducible authored-level scripts before
  attempting Phase 08/10 gates.

## 2026-11-28 — Visual overhaul first slice — IN PROGRESS

- Inputs: visual overhaul brief, existing Phase 00–09 implementation, `.codex/01`–`.codex/11`, three
  reference PNGs and the new `.codex/12`–`.codex/17` design/QA records.
- Scope: dedicated gameplay viewport, Vietnamese game HUD, local seasonal SVG art, event-driven combat
  feedback, visible nest pickup collection, formula shortcuts and player-facing lifecycle controls.
- Changes: `src/gameplay.css`, `BattlefieldPage`, `PhaserBattlefieldCanvas`, local `public/assets`, browser
  visual/pickup specs and before/after QA captures. Simulation contracts remain the single source of truth.
- Decisions: D20–D22 in `.codex/09-DECISIONS.md` record fixed viewport composition, local Phaser art and
  pickup-first pointer priority.
- Evidence: `npm run verify` exit 0 (lint, format check, strict typecheck, 26 Vitest tests and build);
  `npm run test:e2e` exit 0 (9 Chromium tests). Visual captures were inspected at 1920×1080, 1440×900,
  1366×768 and 1280×720, plus winter and real nest-pickup flows. The pickup flow observed energy 150 →
  175 only after clicking the visible pickup.
- Not claimed: final commissioned atlases/audio, full animation state coverage, detailed reward metrics,
  measured performance profile, CSP/security audit or release packaging. See `.codex/17-POLISH-PROGRESS.md`
  for the V01–V11 visual gate status.
- Next exact task: complete the remaining V04–V09 lifecycle/animation states, then execute V10 menu/audio
  and V11 performance/security gates.

## 2026-11-28 — V3 strategic combat evolution — IN PROGRESS

- Inputs: V3 brief plus `.codex/18`–`.codex/25`; existing source, tests, branch history and baseline
  screenshots were reconciled before editing. V3 supersedes the visible manual Fire loop with automatic
  fixed-step attacks while retaining a compatibility command for old callers.
- Changes: per-unit formula assignment/ownership, automatic scheduling and attack states; explicit tile
  placement and relocation cost/cooldown; shield/armor/health defense pipeline; rabbit/turtle/wolf local
  art; placement/selection/health-bar feedback; Vietnamese typography and V3 browser evidence paths.
- Evidence at checkpoint: targeted V3 tests 6 passed; existing simulation tests 20 passed; targeted browser
  placement, pickup, visual, wave, boss and skill flows passed. Final `npm run verify` and full E2E are still
  pending after the last interaction and screenshot changes.
- Not claimed: final commissioned atlases/audio, native drag/drop transfer, complete six-level strategy
  solvability proof, stress/performance profile, CSP/security audit, Docker/deployment or merge.

## 2026-11-28 — V3 implementation slice verification — PASS

- `npm run verify` exit 0: lint, Prettier check, strict typecheck, 9 Vitest files / 32 tests and production
  build. Build retains the non-blocking Vite warning for the 2,243 kB minified Phaser chunk.
- `npm ci` exit 0 from the updated lockfile; npm reports the same 2 moderate React Router advisories.
- `npm run test:e2e` exit 0: 10 Chromium tests. The placement capture was rerun after a 500 ms Phaser
  settle and passed; screenshot evidence is under `artifacts/visual-qa/v3-after/` with the prior baseline
  under `artifacts/visual-qa/v3-before/`.
- Visual review inspected auto-combat projectile state, exact-tile placement, mixed turtle/boar defenses and
  winter responsive treatment. No blocker observed. React Router future-flag and Node deprecation warnings
  remain informational.
- Exit gate status: V3 formula/ownership/automatic-combat/placement/relocation/enemy-defense slice passes;
  full art/audio, stress/security, deployment and merge gates remain open and are not claimed. `npm audit
  --omit=dev` reports 2 moderate React Router advisories after upgrading from 6.30.1 to 6.30.6; the
  remaining suggested fix is a breaking React Router 7 migration and is deferred.

## 2026-11-28 — Asset production and integration continuation — IN PROGRESS

- Inputs: shared-chat master prompt for full asset pack/integration, existing asset pipeline docs, current
  local SVG inventory, Phaser loader, V3 screenshots and test baseline.
- Changes: added `public/assets/manifests/*.json`, `docs/asset-inventory.md`, `.codex/26`–`.codex/33`,
  a typed runtime asset manifest, manifest path checker and generated Pack 01 visual-development preview.
  Phaser now preloads only the typed local runtime subset; pending atlas/audio/per-skill art is explicit.
- Evidence: `npm run assets:check` exit 0 (27 entries); `npm run verify` exit 0 (33 Vitest tests and
  production build); `npm run test:e2e` exit 0 (10 Chromium tests) after a dedicated 4173 server was
  used because a separate user Vite process held the project lock at 5173. Existing V3 visual captures
  were regenerated by that suite; warnings remain React Router future flags and Node deprecations.
- Not claimed: final atlases, per-skill illustrations, audio, long-session profile, CSP audit or owner
  visual approval. The generated contact sheet is a reference artifact only.

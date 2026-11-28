# SnowGraph V3 progress

Branch: `feat/v3-gameplay-evolution`
Status: V00 audit PASS; V01–V06 domain/browser slice PASS; later release gates open.

| Phase | Status | Evidence |
|---|---|---|
| V00 Audit/reconciliation | PASS | Brief/specs/source/assets/tests read; baseline captured under `artifacts/visual-qa/v3-before/`; baseline E2E 9 passed; baseline verify exposed an existing Prettier failure in the visual report. |
| V01 Formula assignment | PASS (domain slice) | Per-unit assignment, invalid rollback, idempotent apply, formula status and independent formula test coverage. |
| V02 Ownership | PASS (domain slice) | Bounded canonical/behavioral equivalence conflict and ownership release-on-reassignment policy tested. |
| V03 Auto combat | PASS (domain slice) | Fixed-step scheduler emits independent shots without Fire commands; cooldown and projectile snapshots remain authoritative. |
| V04 Placement | PASS (slice) | Simulation accepts exact tile placement; Phaser renders valid/invalid overlay and sprite ghost; browser placement capture passes. Full drag/drop matrix remains. |
| V05 Relocation | PASS (domain/UI slice) | Move preserves assignment/cooldown/identity, charges 20 energy and applies a 180-tick cooldown; deterministic rejection is tested. Full browser cooldown capture remains. |
| V06 Enemy defense | PASS (domain/UI slice) | Turtle armor, boar reduction, raven motion and wolf resistance are modeled; mixed-defense browser capture passes. Full six-level strategy matrix remains. |
| V07 Waves/balance | NOT STARTED | Level wave diversity updated; verified winning-strategy playtests remain. |
| V08–V12 Art/UI/feel | IN PROGRESS | Local assets, typography cleanup, selection/placement/armor feedback started; final atlas/audio and full lifecycle remain. |
| V13 Regression/performance | NOT STARTED | Stress profile, CSP/security and full screenshot matrix remain. |

## 2026-11-28 — V00 baseline

- `npm run verify` stopped at `format:check` because `docs/visual-overhaul-report.md` needed Prettier
  formatting; no V3 code had been changed at that point.
- `npm run test:e2e` exit 0 after allowing localhost startup: 9 Chromium tests. Existing output had only
  React Router future-flag warnings and Node deprecation warnings.
- Baseline screenshot visually inspected: flat checkerboard garden, manual `Phóng tuyết cầu` loop and
  shop cards that immediately placed units. Copies are in `artifacts/visual-qa/v3-before/`.

## 2026-11-28 — V01–V06 first implementation slice

- Added the V3 simulation contracts and docs; added six deterministic domain tests in `v3.test.ts`.
- Changed UI to `Gắn công thức`/`Áp dụng công thức`, automatic-combat copy, placement mode, relocation
  mode, Enter apply and selected-unit formula status.
- Added placement overlay/ghost, selection ring, armor/shield bars and first-pass rabbit/turtle/wolf art.
- Targeted V3 simulation tests: 6 passed; existing simulation tests: 20 passed after rebalance-aligned
  expectation updates. Relocation cost/cooldown and rejected-cell messages are now explicit.
- Known limitations: final browser tests/screenshots, full enemy matrix, audio, stress profiling and
  security audit are not yet claimed; drag uses the browser's card gesture to enter placement mode and
  does not implement native drop transfer.
- Next task: run the complete V3 browser/visual matrix, then execute release verification and document
  the remaining art/audio/performance gates honestly.

## 2026-11-28 — V04–V06 browser/visual slice — PASS

- Added screenshot evidence paths for placement, automatic combat, mixed enemy defenses and responsive
  layouts under `artifacts/visual-qa/v3-after/`.
- Added relocation rejection feedback, visible relocation cost and a deterministic cooldown assertion.
- `npm run verify` exit 0: lint, format check, strict typecheck, 9 Vitest files / 32 tests and production
  build. Vite reports the existing non-blocking 2,243 kB minified Phaser bundle warning.
- `npm ci` exit 0 from the committed lockfile; npm reports the same 2 moderate React Router advisories.
- `npm run test:e2e` exit 0: 10 Chromium tests, including placement, automatic combat, mixed defenses,
  pickups, authored waves, skills, boss, campaign and responsive winter capture. A follow-up placement
  capture after a 500 ms render settle also passed (1 test).
- Manually inspected `v3-after/auto-combat/auto-combat-1440x900.png`, `v3-after/placement/placement-1440x900.png`,
  `v3-after/enemy-mechanics/l3-defenses-1440x900.png` and `v3-after/responsive/winter-1440x900.png`; no
  visual blocker observed. Browser output contains only React Router future-flag and Node deprecation warnings.
- Release gates still open: final commissioned atlas/audio, native drag/drop transfer, complete six-level
  strategy solvability proof, stress/performance profile, CSP/security audit, deployment and merge. Dependency
  audit status: `npm audit --omit=dev` reports 2 moderate React Router advisories remaining; the 3 high
  advisories were removed by upgrading `react-router-dom` to 6.30.6. The suggested React Router 7 fix is
  deferred to a separate migration task because it is breaking.

## 2026-11-28 — Asset pipeline continuation — PASS (integration slice)

- Added manifest-driven runtime preload and machine-readable asset status manifests. `npm run assets:check`
  validates 27 unique entries and all non-pending local files.
- Added asset production plan, manifest spec, integration contract, style guide, animation blueprint,
  visual checklist, blocker report and asset progress record under `.codex/26`–`.codex/33`.
- Added a generated Pack 01 contact sheet under `artifacts/asset-preview/`; it remains reference-only and
  is not used as a runtime texture.
- `npm run verify` exit 0 (10 Vitest files / 33 tests); `npm run test:e2e` exit 0 (10 Chromium tests).
- Full atlas/audio/per-skill art production remains blocked on production asset source and owner approval.

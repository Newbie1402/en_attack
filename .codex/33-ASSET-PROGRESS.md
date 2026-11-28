# Asset production and integration progress

Branch: `feat/v3-gameplay-evolution`

| Phase | Status | Evidence |
|---|---|---|
| A Audit | PASS | Existing docs, references, repo assets, Phaser loader and V3 screenshots reconciled. |
| B Style | PASS (direction) | `29-STYLE-GUIDE.md` records approved chibi cartoon palette, silhouette, scale and forbidden directions. |
| C Swallows | PASS (first-pass integration) | Three local SVGs plus nest are in manifest; Phaser now loads from centralized runtime manifest. Atlas remains pending. |
| D Enemies | PASS (first-pass integration) | Seven local enemy/boss SVGs mapped to mechanics; future cast remains pending. |
| E Nest/pickups | PASS (first-pass integration) | Energy/skill assets and collection flight are live; per-skill art remains pending. |
| F Environments | PASS (first-pass integration) | Spring/winter local backdrop and square tile treatments are live. |
| G VFX/UI/audio | IN PROGRESS | Current Phaser/CSS effects are documented; authored VFX/audio remain pending. |
| H QA | IN PROGRESS | Manifest checker added; full verify/E2E/visual review must be rerun after this asset-pipeline change. |

## 2026-11-28 — asset pipeline checkpoint

- Added `public/assets/manifests/*.json`, `docs/asset-inventory.md`, typed runtime asset loading and
  `npm run assets:check`.
- Generated `artifacts/asset-preview/pack-01-swallow-contact-sheet.png` as a style reference; it is not
  mislabeled as a runtime atlas.
- Classified existing SVG/tween work as `first-pass`; atlases, audio and future assets are explicitly
  `external-authoring-pending`.
- Next exact task: run asset checker, full verification, browser screenshots and update the parent PR.

## 2026-11-28 — Pack 01 art-director handoff

- Added `.codex/34-PACK01-SWALLOW-HANDOFF.md` with the supplied visual brief, 4-pose contract,
  normalized anchor `(0.46875, 0.921875)`, integration rules and rejection gate.
- Added `artifacts/asset-preview/pack-01-swallow-contact-sheet-v1.jpg` as received visual evidence.
- The chat response classified the work as `Runtime Candidate v1` / `needs-revision`; browser QA was not
  performed by the art handoff.
- The individual PNG poses, portraits and 1024×256 sheets named by the handoff were not transferred into
  this checkout, so the runtime manifest and Phaser fallback were intentionally left unchanged.
- Next exact task: obtain the actual PNG files, validate RGBA/dimensions/alpha/anchor, then integrate and
  capture the required spring/winter browser evidence before changing runtime status.

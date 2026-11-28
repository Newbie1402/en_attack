# Asset production and integration progress

Branch: `main` after `feat/full-asset-runtime-integration`

| Phase | Status | Evidence |
|---|---|---|
| A Audit | PASS | Existing docs, references, repo assets, Phaser loader and V3 screenshots reconciled. |
| B Style | PASS (direction) | `29-STYLE-GUIDE.md` records approved chibi cartoon palette, silhouette, scale and forbidden directions. |
| C Swallows | PASS (runtime candidate) | Three RGBA 4×1 pose sheets, portraits and extracted poses are integrated with event-driven frame changes and SVG fallback. |
| D Enemies | PASS (runtime candidate) | Six authored idle/portrait pairs are mapped to mechanics; guardian keeps the local fallback. |
| E Nest/pickups | PASS (runtime candidate) | Nest, six collectible/HUD pairs and collection flight are live; simulation remains authoritative. |
| F Environments | PASS (runtime candidate) | Spring/winter RGBA tiles and scenic strips render over deterministic square board transforms. |
| G VFX/UI/audio | PASS (runtime candidate) | Six VFX sheets, UI skins and local WAV music/SFX are loaded; mute/reduced-motion gates are wired. |
| H QA | PASS WITH HUMAN GATES OPEN | Asset checker, verify, browser, container/CSP, audit and deterministic stress evidence are recorded. |

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

## 2026-11-28 — Full bundle and release hardening

- Received and integrated Packs 01–06: 78 PNG, 10 WAV, manifests, previews and validation notes.
- Browser and production-container checks pass; React Router 7.18.7 removes the two moderate audit findings.
- Remaining status is intentionally `runtime candidate`: owner visual/provenance approval and optional wall-clock
  memory profiling are not replaced by automated checks.

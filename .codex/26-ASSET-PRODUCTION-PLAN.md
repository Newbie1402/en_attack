# SnowGraph asset production plan

This plan extends the V3 gameplay slice with a truthful, integration-first asset pipeline. It does not
turn a one-frame SVG into a claimed production atlas.

| Phase | Input | Implementation | Output | Verify / exit gate |
|---|---|---|---|---|
| A Audit | existing `.codex`, references, `public/assets`, Phaser loader, screenshots | inventory current files and classify first-pass vs pending | gap report and baseline evidence | every current runtime asset has a manifest entry |
| B Style | approved swallow and seasonal concept direction | lock palette, silhouette, outline, pivot, scale and composition rules | `29-STYLE-GUIDE.md` | visual checklist agrees with references; no pixel/dashboard drift |
| C Swallows | three current local swallow files | integrate centralized runtime manifest; specify atlas clips and hitboxes | character manifest and animation blueprint | loader check, browser gameplay capture |
| D Enemies | seven current enemy/boss files and V3 combat state | map visual identity to defense mechanics; leave future cast pending | enemy manifest and blocker list | mixed-defense browser capture and asset path check |
| E Nest/pickups | current nest, energy and skill bundle | preserve domain-owned lifecycle; document missing per-skill art | pickup/effects manifests | pickup collection E2E and no-auto-credit assertion |
| F Environments | spring/winter backdrops and square board renderer | keep modular backdrop plus procedural square tile treatment | environment manifest | spring/winter screenshots, no remote assets |
| G VFX/UI/audio | current Phaser/CSS effects | document first-pass implementation and pending authored packs | effects/UI/audio manifests | runtime no-op for pending assets; no false completion |
| H QA/reconciliation | all files and screenshots | validate JSON/path integrity, run verification and record blockers | inventory, checklist, progress | `assets:check`, `verify`, E2E, visual review |

Phase exit is evidence-based. Missing commissioned art, audio or atlas export remains a blocker rather than
being replaced by a screenshot, hotlink or fake sprite sheet.

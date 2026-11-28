# Asset blockers and honest fallbacks

| Blocker | Impact | Current fallback | Upgrade path |
|---|---|---|---|
| No authored sprite atlas export in repository | Swallows/enemies have one-frame SVGs | Phaser deterministic bob, tint and event tweens | Add licensed/original atlas files and update manifest status to `ready` |
| No per-skill pickup illustrations | Skill drops share one readable local icon | HUD labels and color-coded glyphs | Author separate silhouettes for slow/freeze/damage/reset/relocate |
| No audio files | No fire/impact/collect/ambient sound | Silent gameplay; no autoplay hacks | Add local/licensed files and gesture-gated audio service |
| No measured long-session profile | Performance exit gate is unverified | Fixed caps and deterministic render loops | Run 10-minute browser profile and record frame/memory evidence |
| React Router 7 audit fixes are breaking | `npm audit --omit=dev` retains 2 moderate findings | 6.30.6 removes 3 high findings | Separate v7 migration with route regression coverage |

Do not close a blocker by marking a placeholder complete. The current app remains runnable and the exact
missing input is recorded here and in `33-ASSET-PROGRESS.md`.

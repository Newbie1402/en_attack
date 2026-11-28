# Asset blockers and honest fallbacks

| Blocker | Impact | Current fallback | Upgrade path |
|---|---|---|---|
| Final authored art approval is open | Runtime candidate PNG sheets/portraits are integrated, but final art approval and rights sign-off are not automated | Authored PNG runtime with reviewed SVG fallback | Complete owner visual and provenance review before public distribution |
| Pack 01 handoff remains a runtime candidate | Actual pose sheets are present and validated; the handoff still classifies them as `needs-revision` | Typed 4×1 sheets with event-driven pose changes | Review the idle/blink/celebration expansion if production animation fidelity requires it |
| Per-skill pickup illustrations are integrated but not final-approved | Six collectible/HUD pairs exist and render; final readability review remains human | Per-skill local PNGs plus text labels | Approve or revise silhouettes after manual visual review |
| Local audio is integrated | Gesture-gated music and event SFX are loaded from local WAVs; rights approval is separate | Mute setting and no-autoplay fallback | Complete provenance/rights review |
| No measured long-session profile | Performance exit gate is unverified | Fixed caps and deterministic render loops | Run 10-minute browser profile and record frame/memory evidence |
| React Router 7 migration required a compatibility pass | React Router 7.18.7 is now installed and the full route/E2E suite passes | Current v7 API surface is covered by browser tests | Keep router upgrade pinned and revisit only on a future major change |

Do not close a blocker by marking a placeholder complete. The current app remains runnable and the exact
missing input is recorded here and in `33-ASSET-PROGRESS.md`.

# SnowGraph asset inventory

The machine-readable inventory lives under `public/assets/manifests/`. This table summarizes what is
actually in the repository today.

| Group        | Integrated files                                                    | Status            | Notes                                                                |
| ------------ | ------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------- |
| Swallows     | three 4×1 pose sheets, portraits, idle/charge/release/recovery PNGs | runtime candidate | Phaser changes frames from simulation events; SVG fallback retained. |
| Lucky Nest   | idle, portrait, crack overlay, shell fragment PNGs                  | runtime candidate | Production and pickup lifecycle remain simulation-backed.            |
| Enemies      | six idle/portrait PNG pairs                                         | runtime candidate | Guardian still uses the reviewed local SVG fallback.                 |
| Pickups      | six collectible/HUD PNG pairs                                       | runtime candidate | Simulation still owns readiness, inventory and skill effects.        |
| Projectile   | normal, frost and heavy snowball PNGs                               | runtime candidate | Projectile path and collision remain domain-owned.                   |
| Environments | spring/winter tiles, scenic strips, local SVG backdrops             | runtime candidate | Square tiles are displayed over the deterministic board fill.        |
| Effects      | six 6-frame sheets and snow particle                                | runtime candidate | Hit/shield effects are event-driven cosmetic sprites.                |
| UI/audio     | seven UI PNGs, one music loop and nine SFX WAVs                     | runtime candidate | Audio is loaded locally and played only from simulation events.      |

Run `npm run assets:check` to validate the base manifest plus all pack manifest file paths. Run the browser
suite to verify that the runtime loader only requests files classified as present.

The generated Pack 01 concept previews are stored at `artifacts/asset-preview/pack-01-swallow-contact-sheet.png`
and `artifacts/asset-preview/pack-01-swallow-contact-sheet-v1.jpg`. The complete bundle's per-pack manifests,
task notes and offline validation are preserved under `docs/asset-handoff/`; the original art handoff contract
remains at `.codex/34-PACK01-SWALLOW-HANDOFF.md`. The bundle is integrated as a runtime candidate, not a final
rights-cleared art approval.

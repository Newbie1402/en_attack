# Integrate Pack 05

Read .codex/PACK05-HANDOFF.md and integration/pack05-manifest.json. Inspect existing schema/IDs and merge entries. Use base-aware URLs, preload only required textures, reuse textures and destroy scene-owned tweens/particles. Follow animation contract. Run existing npm run verify, actual browser QA and report screenshots, mapping, changed files, observed defects and exact test results. Do not claim production-final.

Check actual trajectory and collision unchanged, events fire exactly once, shield/armor feedback distinct, effects anchored to hit position, no baked health or damage text, reduced motion and particle caps. Verify every animation frame slices correctly and scene restarts do not leak emitters. No claims of runtime FPS.

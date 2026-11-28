# Asset integration contract

1. Simulation owns entities, events, damage, rewards and progression.
2. Phaser owns texture loading, display scale, cosmetic tweens and reduced-motion presentation.
3. React owns HUD/read-model composition and never loads gameplay textures directly.
4. Asset keys are centralized in `src/presentation/assets/assetManifest.ts`; Phaser scenes must not grow
   another hand-written path list.
5. A missing `external-authoring-pending` asset must remain absent from runtime preload and use an honest
   documented fallback only where the existing game already has one.
6. Animation completion must never grant energy, deal damage, spawn projectiles or advance progression.
7. All asset paths are local same-origin files. Asset loading must not add network APIs or runtime secrets.

The current integration is a first-pass SVG pipeline. Authored atlases, audio and per-skill pickup art are
explicit follow-up inputs, not silently generated placeholders.

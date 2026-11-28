# 09 — Decision log (ADR)

| ID | Decision | Reason / status |
|---|---|---|
| D01 | Math as actual graph-based attack; no auto-aim | Owner concept |
| D02 | Natural square seasonal tiles, no campaign axes; hover coordinates | Owner correction supersedes original graph-grid mockup |
| D03 | Pilot swallow mascot navy/orange/cream; two approved references | Owner supplied mascot and approved visuals; public brand permission not verified |
| D04 | Physical nest drops with click and animation; inventory credited only by collection | Owner requested PvZ-like feel; timing chosen for MVP |
| D05 | Phaser 3 + React/Vite TS, pure fixed-step core; no backend | Proposed engineering default; pin versions after verification |
| D06 | f(0)=0, horizontal speed, shared polyline, no gravity | Proposed math default; explicit rather than silent translation |
| D07 | Formula lock global, 3 uses default, reset chosen bucket | Proposed balancing default based on approved concept; exact equivalence not promised |
| D08 | 6 playable MVP levels, 36 future target | Proposed scope guard; six seasonal chapter architecture |
| D09 | 3 hearts, deploy first 3 columns, no defender body block | Proposed MVP balancing simplification |
| D10 | vi default, en optional; local progress only | Proposed product default |
| D11 | Skill freeze affects enemies only, no auto-pause on typing | Owner's tactical concept + proposed explicit clock behavior |
| D12 | Art reference not runtime background; fallback original placeholders honestly labeled | Prevent fake interactive mockup |
| D13 | Pin React 19.3.1, Vite 8.4.0, Phaser 3.90.0, Router 6.30.1, Zustand 5.1.0, Zod 4.6.7, math.js 15.3.0, Vitest 5.1.2 and Playwright 1.58.2 for the foundation | Package metadata was checked on 2026-11-28; Vite 8 is required by the selected React plugin and Vitest 5 supports Vite 8; verified by clean `npm ci`, typecheck, build and browser smoke |
| D14 | Keep React as a low-frequency route/HUD shell and Phaser as the single canvas owner; mount/destroy Phaser from one React effect | Phase 00 smoke needs a real canvas without creating a second simulation clock; the boundary is exercised by the Playwright canvas assertion and leaves domain code framework-free |
| D15 | Use a bounded adaptive polyline as the only trajectory representation for preview and projectile flight; evaluate horizontal distance at fixed 60 Hz | This makes visual and collision paths identical, avoids Phaser gravity, and is covered by sampler and simulation tests; conservative termination is preferred over bridging a discontinuity |
| D16 | Render the vertical slice with original local Phaser vector primitives while art assets are not yet produced | The reference PNGs guide silhouette/palette only; no reference screenshot is shipped or composited. This is a reversible Phase 03 foundation pass and remains below the Phase 08 concept-fidelity gate |
| D17 | Store only a bounded version-1 campaign/settings object in localStorage and recover invalid data to defaults | The MVP has no backend; Zod parsing prevents malformed or future data from crashing the app, and winning a level unlocks only its immediate successor |
| D18 | Sandbox previews call the same validator and sampler as combat but never write campaign progress | This keeps the formula contract singular while preserving the campaign as the only progression surface |
| D19 | Keep procedural/vector art as a documented placeholder until Phase 08 asset and manual visual gates | It is real local rendering and preserves the approved silhouette/palette, but the supplied concept images are references, not production sprite sheets or backgrounds |
| D20 | Give gameplay its own fixed desktop viewport and keep the website shell off the play route | The brief prioritizes battlefield visibility and no-scroll control access; mobile falls back to a normal document flow so touch layouts remain usable |
| D21 | Load original local SVG art in Phaser while keeping simulation data and animation ownership separate | Independent textures replace the primitive runtime character path; simulation events may trigger cosmetic tweens, but never rewards, damage, projectiles or progression |
| D22 | Resolve pickup pointer hits before unit selection when both occupy the same cell | A collectible is the higher-intent visible affordance; this prevents the nest underneath from intercepting a valid collection click and is covered by the browser pickup test |

New ADR: ID, context, alternatives, decision, consequences, source (owner or engineering default), verification and migration impact. Do not rewrite history; supersede by new entry. Tuning defaults are reversible config values, not owner-confirmed final balance.

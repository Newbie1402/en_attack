# SnowGraph QA report

Date: 2026-11-28

## Verification executed

| Gate                     | Result | Evidence                                                                                                                                                  |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean dependency install | PASS   | `npm ci` completed in the release Docker build.                                                                                                           |
| Static checks            | PASS   | `npm run verify`: ESLint, Prettier, asset manifests, strict TypeScript, 35 Vitest tests and production build.                                             |
| Asset integrity          | PASS   | `npm run assets:check`: 27 base entries and 7 pack manifests; PNGs report RGBA dimensions through `file`/`sips`.                                          |
| Browser acceptance       | PASS   | `npm run test:e2e`: 11 Chromium tests; visual test also asserts no `/assets/` response is 4xx/5xx.                                                        |
| Production container     | PASS   | `docker build -t snowgraph:local .`; Nginx serves `/healthz`, `/play/L6`, CSP/security headers and runs as `uid=101(nginx)`.                              |
| Container browser smoke  | PASS   | Full 11-test Playwright suite against `http://127.0.0.1:18080` with `PLAYWRIGHT_BASE_URL`.                                                                |
| Dependency audit         | PASS   | `npm audit --omit=dev`: 0 vulnerabilities after upgrading `react-router-dom` to 7.18.7.                                                                   |
| Simulation stress        | PASS   | 36,000 deterministic ticks (10 simulated minutes), 110.13 ms on this run, 330 events; entity caps stayed within 60 enemies / 64 projectiles / 12 pickups. |

## Accessibility and lifecycle coverage

- `Escape` cancels placement/relocation and toggles pause/resume without stealing formula text input.
- Settings now affect a gameplay mount: mute suppresses local audio, reduced motion removes decorative bob/tweens/effects while preserving pose changes, and hints can be hidden.
- Focus-visible styles and semantic labels remain in the HUD; existing browser tests cover keyboard-safe formula editing, settings persistence, pause state and route recovery.
- Phaser remains the only simulation presentation loop; no React per-frame state or animation-driven gameplay was introduced.

## Known non-blocking items

- Vite reports a 2.25 MB minified Phaser chunk above the 500 kB advisory threshold. The game remains within the
  explicit entity caps; code splitting is a future performance optimization.
- The shared art bundle is integrated as a runtime candidate. Final owner visual approval and distribution-rights
  review are still human gates and are not claimed by automated tests.
- The stress test advances ten minutes of simulation deterministically rather than holding a browser tab open for
  ten wall-clock minutes; browser memory-trend profiling remains a manual follow-up if release distribution needs it.

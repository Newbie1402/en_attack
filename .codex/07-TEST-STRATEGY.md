# 07 — Verification and acceptance matrix

Use Vitest pure deterministic unit tests, integration via actual commands and fixed ticks, Playwright browser tests using actual UI. Do not rely on mocked combat or screenshots alone. Test fixtures may access headless engine, but production must not expose cheat/debug actions. Use seeded configs and record test input, expected outcome, actual result. Test names include feature terms used by phase commands. CI runs `npm run verify` plus E2E with pinned browser installation. Record browser/OS and hardware for metrics; screenshots in docs/screenshots (not reference art).

| ID | Scenario | Required result |
|---|---|---|
| M01 | `0`, `x`, `2x`, `x+x`, `0.6x-0.08x^2`, `sin(x)`, `cos(x)-1` allowed level | Valid path from origin, expected coordinates |
| M02 | `x+2`, `cos(x)`, blank, unknown variables | Localized error, no shot or consumption |
| M03 | `x/(x-2)`, `x/(x-2)^2`, `tan(x)`, `sqrt(1-x)-1` | Stop before uncertified domain/pole, no bridge/teleport |
| M04 | JS/script, `import`, assignment, arrays, accessor, nested parse bomb, huge exponents/length | Bounded reject, no execution, no freeze/crash |
| M05 | Same path preview/flight/contacts; resize DPR and board | Shared polyline, 1:1 tile transform, unchanged world |
| C01 | Fast projectile through moving circle, thin obstacle, curved multisegment | Swept hit, earliest contact, no tunneling |
| C02 | Multiple overlapping targets, pierce, AOE, shield angle, death | Deterministic order, one hit per target per projectile, max hits, armor policy |
| C03 | Move bird during active flight, select another bird | Origin immutable, cooldown per bird |
| E01 | Buy occupied/forbidden tile/insufficient energy; rapid double-click | Reject without charge, one accepted placement |
| E02 | Move valid/invalid; cooldown and boost persist | Charge once, no state loss |
| E03 | Spawn pop (not ready), collect, repeat click, expire, inventory full | No premature or duplicate credit; cap and expiry correct |
| E04 | Seeded nest drop, cap defer, guaranteed reset | Reproducible, no RNG-only boss failure |
| S01 | Slow 8s, Freeze 4s, overlapping; pause | Enemy scales only; duration measured in ticks, pause freezes all |
| S02 | Arm boost then invalid shot, then valid shot | Invalid preserves; next valid x2 once |
| S03 | Reset select used bucket vs empty/invalid | Chosen bucket restored, others/family unaffected; stock atomic |
| Q01 | `2x`, `x+x`, `2.0*x`, `x*2`; shifted sine alias; rational mismatch | Alias same bucket; domain mismatch not simplified incorrectly |
| Q02 | Fire 3 times with same bucket across birds, move, 4th attempt | 4th rejected even if previous misses; no cooldown/boost cost |
| Q03 | Boss phase cross both thresholds in one hit | Once each, adds scheduled before win, usage persists |
| W01 | Start/pause/resume/hidden tab/retry, wave spawn cap | No double session or hidden ticks; deterministic retry |
| W02 | Enemy breach and same-tick shot contact, last heart | Correct temporal ordering and loss precedence |
| W03 | Six authored levels, reproducible winning input scripts and losing run | No impossible quota, resource or wave; no debug shortcuts |
| P01 | Unlock, reload, replay, settings vi/en, corrupt/future save | Progress persists, safe recovery, no match resume implied |
| P02 | Sandbox formula/axes/toggle/target/reset | Same math engine, no progress changes, no campaign axes |
| V01 | 1280x720, 1440x900, 1920x1080; resize/DPR; narrow menu | Board square, no clipped essential controls, no axis labels |
| V02 | Nest animation: glow, crack, pop, bounce, hover, collect-to-HUD | All stages visible; domain timing authoritative; reduced motion functional |
| V03 | Mascot silhouette, seasonal assets, selection, formula errors | Art aligned to reference, no dashboard or screenshot-based UI |
| A01 | Keyboard navigation, focus, Enter fire, Esc pause, text input | No shortcut steals typed character; visible focus, no color-only state |
| A02 | Mute/reduced motion, invalid formula and route | No unwanted sound/motion, clear error and recovery |
| R01 | Repeated mount/unmount/retry, 10-minute stress | One canvas, listener/timer cleanup, entity caps respected |
| R02 | Static production, deep URL, CSP console and local assets | No unsafe-eval or unauthorized requests; SPA fallback |

## Performance targets (measure, not guarantees)
Desktop target 60 FPS at 1440x900 with 40 enemies/20 defenders/30 shots/12 pickups under normal play. Fixed-step 60 Hz, max 5 catch-up ticks. Target p95 simulation step <4ms and preview latency <100ms after debounce on recorded reference device; if missed profile and document. Stress config may use caps up to 60 enemies/64 shots/12 pickups, no uncontrolled particle growth. Run 10 minutes seeded session; compare after repeated retry/route changes, inspect memory trend, not exact absolute RAM guarantee. If profiling unavailable mark unmeasured, not pass. Prefer game clarity over particle count.

## Visual review
Screenshots of real app, not generated mockups: menu, spring and winter gameplay, selected unit and error, popup collection at multiple times, boss quota panel, sandbox, end state. Compare concept silhouette, material and hierarchy; verify no Ox/Oy on campaign, tile centers square, readable coordinates only on interaction. Document art gaps and placeholder assets. Browser automation may not prove aesthetics: manual review required and owner has final approval.

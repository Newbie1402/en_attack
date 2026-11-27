# 10 — Initial content and balance (provisional, tune after playtest)

All values config-driven; seconds converted to integer ticks once, world cells units. Board 10x5; deployment cols 0–2; 3 hearts; energy cap 999. Default starting energy 250, nest +25 energy every 8s, skill every 18s; each production defers at cap and does not accumulate backlog; skill max 1 uncollected per nest, global pickup cap 12, ready delay 0.6s, TTL 12s after ready. Basic drop weights Slow 45, Freeze 25, Boost 30, Reset 0 until quota enabled; quota levels Slow 35, Freeze 20, Boost 25, Reset 20. Guarantee Reset by third eligible skill production after quota phase starts if no reset has been produced since phase start, and provide one starting Reset for L5/L6. If inventory full, guaranteed drop may be deferred; no forced loss. Seed and pity per match, config validate. No random monetization.

| Unit | Cost | Damage | Cooldown s | Horizontal speed cells/s | Hit behavior |
|---|---:|---:|---:|---:|---|
| Snow Swallow | 100 | 60 | 1.5 | 6 | 2 distinct targets |
| Frost Swallow | 175 | 40 | 2 | 5 | 1; enemy local slow 0.6 for 3s (strongest slow wins) |
| Heavy Swallow | 250 | 100 | 3.5 | 4 | 1st contact AOE radius 0.8, no duplicate damage |
| Lucky Nest | 50 | — | — | — | production only |

Shot radii 0.12/0.15/0.22 cells. Move 25 energy, 2s move cooldown, firing cooldown separate. Global enemy time factor min(local frost, global slow) or 0 freeze. Double Damage x2 on launch, applies to heavy AOE base too. Max 64 active projectiles, 60 enemies, 15 placed units. Max 128 formula buckets, 3 uses each on quota levels; normal unlimited. Optional family cap off by default. All formulas listed in 02 allowed as unlocked; avoid tan/poles in early chapters.

| Enemy | HP | Speed cells/s | Radius cells | Rule |
|---|---:|---:|---:|---|
| Snow Fox | 90 | 0.28 | 0.27 | straight lane |
| Ice Boar | 220 | 0.18 | 0.34 | frontal shallow left-to-right hit damage x0.35; steep tangent abs(dy/dx)>=0.75 bypasses; AOE uses incoming tangent |
| Shadow Raven | 120 | 0.36 | 0.25 | lane switch preauthored after telegraph 0.6s; smooth 1s transition |
| Frost Guardian | 1000 | 0.065 | 0.48 | phases per 01; final speed x1.4; preauthored adds/obstacles; no mandatory immunity |

## Level authoring seed data
These are starting configurations, not verified balance. Agent must create exact wave spawn times/lane indices, obstacle cells, starting units and deterministic winning input fixture; tune with documented reasons. Spawn at right edge, lane centers; base x=0. All levels include win/loss. Use easy pace first, progressively increase pressure; do not force unique equation when equivalent valid solution exists.

| Level | Theme | Start energy | Waves | Challenge |
|---|---|---:|---:|---|
| L1 First Flight | Spring | 200 | 1 | 1 free basic at col1,row2; 3 foxes same lane, `0` tutorial, no quota |
| L2 Lucky Nest | Spring | 300 | 2 | purchase nest/birds, collect energy/skills; 6 foxes over 2 lanes |
| L3 Around the Stone | Spring | 300 | 2 | rock in lane between bird and target, quadratic trajectory; 5 foxes + 1 boar |
| L4 Frozen Trails | Winter | 350 | 3 | sin/abs hints, raven and time skills; ~10 enemies, starts Slow+Freeze |
| L5 Think Different | Winter | 350 | 3 | exact cap 3, Reset tutorial, 1 starting reset, multi-lane enemies, preview on |
| L6 Frost Guardian | Winter | 400 | 3 incl boss | 1 reset, 1 freeze; boss enters final wave, lock activates 70%, preview off <=30%, 2 adds final phase |

Required tutorial examples `0`, `0.5x`, `-0.08x^2+0.6x`, `sin(x)`, `cos(x)-1`, `abs(x-2)-2`. Actual target positions depend on selected origin and motion; examples not auto-aim. Initial formula unlock sets: L1 constant/linear, L2 same, L3 add quadratic, L4 add trig/radical/abs, L5–6 full validated grammar. Sandbox all implemented functions. Allow functions based on AST and family policy; literal degree classification alone not sufficient to disallow forbidden operators/functions. Include documented acceptance solutions with >=3 distinct allowed curves for quota levels; balance using real play, not cheats. Future map themes: summer sand, autumn leaves, sky islands and ice citadel; optional terrain mechanics only with corresponding new spec/tests.

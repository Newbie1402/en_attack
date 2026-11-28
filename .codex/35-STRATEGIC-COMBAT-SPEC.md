# SnowGraph strategic combat extension

This owner-requested extension adds authored multi-phase encounters and an original defender/enemy
ability layer. It keeps the math trajectory, fixed-step simulation and local asset boundary unchanged.
The mechanics are inspired by readable lane-defense roles, but names, art, timings and interactions are
SnowGraph-specific and do not copy another game's code or assets.

## Encounter phases

Each level may define ordered `WavePhase` entries. A phase owns relative spawn ticks, a Vietnamese title,
an intro line and a deterministic intermission. The scheduler spawns only the active phase. When its
spawns are emitted, the phase enters `clearing`; every enemy carrying that phase index and any in-flight
projectiles must finish before `phaseCleared` starts the intermission. The next phase starts only after
the intermission, so a match cannot win after an early phase. Legacy flat `waves` configs remain a
single phase for fixture compatibility.

## Defender roles

- Én khiên: low-damage formula projectile plus a same-lane guard charge. A breach consumes the charge
  instead of a heart, then the guard recovers after a deterministic 12-second cooldown.
- Én lửa: formula projectile applies a three-second burn, ticking every 30 simulation ticks.
- Én phù thủy: formula projectile applies a four-second hex; later projectile damage is multiplied by
  1.35 while the mark remains.
- Existing Snow, Frost and Heavy swallows remain available. Frost now records a local chill status,
  while the global Slow skill keeps its separate enemy-only clock.

The shop displays a deterministic four-card offer window. `Đổi đội hình` costs 25 energy and rotates
through the configured pool; the authoritative simulation owns the charge and offers, so rapid clicks
cannot duplicate or free-roll defenders.

## Enemy roles

- Kẻ nhảy tường: on its first contact with an authored obstacle in its lane, jumps to the adjacent lane,
  has a short visible jump offset and becomes eligible for a different trajectory.
- Vệ binh băng: starts with crystal shield and armor and has 0.85 freeze resistance, so Freeze slows it
  rather than pretending it is fully immune. Shield and armor are still resolved before health.

Burn, chill and hex are bounded status fields in the domain. Phaser only renders markers, motion and
projectile silhouettes from snapshots/events; no animation callback changes damage, rewards or phase
progression.

## Acceptance

Pure tests cover phase gating/intermission, deterministic reroll charging, shield breach prevention,
burn, wall-jump lane change and ice-guard movement under Freeze. Browser coverage verifies the three-phase
HUD and defender reroll alongside the existing 11 routes/visual/economy gates.

# V3 automatic combat specification

V3 supersedes the manual-fire primary loop in the earlier vertical-slice notes. The fixed-step
simulation owns attack scheduling; React sends assignment, placement and lifecycle commands; Phaser only
renders state and event feedback.

Each deployed non-nest unit has an `assignedFormula`, `attackIntervalTicks`, `nextAttackTick` and
`attackState`. A unit fires only while the match is running, an enemy exists, the unit is deployed and
its valid formula is ready. A shot snapshots the formula, origin and trajectory into the projectile.

The current balance slice uses 1.8 seconds / 2.2 seconds / 3.5 seconds for normal, frost and heavy
swallows. Balance is data-driven in `src/game/domain/simulation/balance.ts`.

Formula editing never resets cooldown. A windup/projectile snapshot is immutable; later assignment only
affects later shots. `fire` remains a compatibility command for old fixtures, but the gameplay UI uses
`assignFormula` and never asks the player to fire repeatedly.

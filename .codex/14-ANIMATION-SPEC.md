# SnowGraph animation specification

The simulation owns truth. Phaser owns cosmetic interpolation and presentation. No animation callback may
spawn a projectile, apply damage, grant a pickup, or change progression.

| State | Presentation | Source of truth |
|---|---|---|
| Idle | gentle scale/bob, blink-ready eye detail | running snapshot tick |
| Selected | warm ring and soft shadow | `selectedUnitId` |
| Fire | short anticipation scale, then launch trail and recovery | `shotFired` event + projectile state |
| Cooldown | reduced saturation and small cooldown arc | `cooldownUntil` |
| Pickup ready | float, sparkle, readable icon | `collectibleTick` and pickup entity |
| Pickup collecting | cosmetic flight toward HUD | accepted `pickupCollected` event |
| Hit | brief tint/scale recoil and damage number | `hit` event |
| Defeat | fade/scale out | `enemyDefeated` event |
| Boss phase | tint, pulse and banner | `bossPhaseChanged` event |

Initial motion uses deterministic tick-derived phase values so pause/retry remains reproducible. Reduced
motion settings may remove bobbing, shake and particle trails while preserving all readable state changes.

# SnowGraph animation blueprint

| Asset/state | Timing | Trigger | Owner | Current implementation | Upgrade input |
|---|---:|---|---|---|---|
| Swallow idle | loop ~1.4s | running snapshot | Phaser | deterministic bob/rotation | authored idle + blink atlas |
| Swallow throw | 80ms recoil | `shotFired` | Phaser | scale tween | anticipation/release/recovery frames |
| Swallow recovery | cooldown | unit snapshot | Phaser | opacity/cooldown state | wing settle frame |
| Enemy hit | 100ms | `hit` | Phaser | tint + popup | hit-react frame |
| Enemy defeat | one-shot | `enemyDefeated` | simulation event + Phaser | removal through snapshot | defeat burst asset |
| Raven flight | loop | tick/position | Phaser | deterministic lane bob | wing-cycle atlas |
| Lucky Nest charge | ~1s | production tick | simulation + Phaser | current production/pickup state | egg glow/shake/crack frames |
| Pickup collect | 350ms | accepted `pickupCollected` | Phaser | flight to HUD | authored sparkle/trail |
| Boss phase | one-shot | `bossPhaseChanged` | Phaser | state/obstacle/feedback | telegraph VFX |

Cosmetic timing is allowed to skip under reduced motion or frame pressure. The simulation event/state
remains authoritative in every mode.

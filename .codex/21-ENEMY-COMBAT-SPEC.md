# V3 enemy combat specification

Enemy state carries health, armor, shield, facing, movement speed and freeze resistance. The deterministic
damage pipeline is: projectile damage → directional reduction → shield absorption → armor absorption →
health damage → defeat/breach events. Values are clamped at zero and hit events report absorbed damage and
remaining armor/shield so the renderer can distinguish blocked from full damage.

Initial playable archetypes are Fox (standard), Rabbit (fast), Boar (front-facing directional reduction),
Turtle (separate armor pool), Raven (deterministic lane-height movement) and Wolf (freeze resistance).
Guardian remains the multi-phase boss. Balance and visuals are configured by kind; no React/Phaser type
switch owns combat rules.

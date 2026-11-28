# V3 deployment and relocation specification

Selecting a shop card enters placement mode. The player then clicks a board cell; the authoritative
simulation validates energy, terrain, occupancy and deployment bounds before charging energy. The board
renders valid cells, blocked cells and a semi-transparent sprite ghost. Escape/right-click cancellation
is represented by the same cancel command path; drag-start enters the same placement mode.

Selecting an existing swallow and choosing `Đổi vị trí` enters relocation mode. A valid move changes only
the cell. Formula assignment, cooldown, identity, historical usage and existing projectiles remain
unchanged. Lucky Nest is stationary in this slice so production cannot be duplicated by movement.

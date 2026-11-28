# V3 acceptance criteria

## Implemented in this checkpoint

- Independent assignment and bounded equivalence conflict are simulation rules.
- Invalid assignment preserves the previous valid formula and cooldown.
- Automatic attack scheduling emits deterministic shots for multiple assigned units.
- Player-selected placement and relocation preserve economy/formula state.
- Turtle armor, boar directional reduction, raven movement and wolf freeze resistance have typed state
  hooks; turtle armor is covered by a unit test.
- Existing verified routes, save boundaries and pickup idempotency remain covered.

## Still required before V3 release sign-off

- Full browser placement/relocation matrix, all six enemy strategies and boss restrictions.
- Complete pickup lifecycle, audio, final atlases and two-pass visual review of Spring Garden.
- 12-unit/30-enemy stress measurement with actual browser/hardware data.
- CSP/security audit, save migration review and release packaging.

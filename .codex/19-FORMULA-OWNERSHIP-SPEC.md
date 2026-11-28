# V3 formula ownership specification

Active formula exclusivity is level-scoped and authoritative. `SimulationState.formulaOwnership` records
the current owner of every assigned formula; it is rebuilt atomically from unit assignments after a
successful assignment or placement.

The equivalence policy is deliberately bounded: canonical polynomial normalization handles numeric and
commutative forms such as `2x`, `2*x`, `x+x`, `x*2` and `x^2`/`x*x`; behaviorally equivalent validated
expressions are compared at deterministic samples with absolute/relative tolerance `1e-6`. Domain
failures are not treated as equal to finite values. Arbitrary symbolic equivalence is not claimed.

Invalid candidates preserve the previous assignment. Conflicts report the owning unit and never steal
ownership. Relocation preserves identity, assignment, ownership, cooldown and historical usage. Restart
creates a fresh registry. Formula usage history remains separate from active ownership so Formula Reset
does not permit two active units to share an equivalent expression.

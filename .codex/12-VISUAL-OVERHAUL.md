# SnowGraph visual overhaul 2.0

This document tracks the visual overhaul requested in the Visual Overhaul & Gameplay Polish 2.0 brief.
The existing verified simulation remains authoritative; this work changes presentation, input affordances,
and feedback without moving damage, rewards, quota, or progression into animation callbacks.

## V00 — Existing implementation audit

- Framework: Vite + React route shell, Phaser 3 canvas, framework-free TypeScript simulation.
- State boundary: `GameSession` owns the fixed-step clock; React receives low-frequency snapshots and
  dispatches typed commands; Phaser subscribes for rendering and pickup pointer input.
- Current strengths: bounded formula parser/sampler, deterministic collision/economy/skills/waves/boss
  logic, 26 unit tests, and browser smoke/gameplay coverage.
- Current defects: global website header consumes gameplay height; shop/skills/formula are stacked cards;
  battlefield is a flat green tile grid; visible units/enemies/pickups are Phaser primitives; combat has
  little event feedback; result states expose raw mode labels; no independent production asset manifest.
- Baseline: `artifacts/visual-qa/before/gameplay-1440.png` and `gameplay-1280.png`, captured from the
  real route and visually inspected against the supplied mascot/gameplay references.

## Prioritized implementation order

1. Dedicated viewport layout and compact HUD with no desktop scroll.
2. Local, independently loaded SVG asset pipeline and manifest.
3. Seasonal board layers and prop depth while preserving square coordinates.
4. Swallow/enemy/pickup sprite presentation with simulation-synchronized motion.
5. Formula lab, lifecycle/result feedback, combat effects and visual QA iteration.

## Exit gates

Each phase must have passing targeted checks, real screenshots at the required sizes, and a recorded
limitation when production artwork, audio, or measurement is not available. A production build alone is
not visual approval.

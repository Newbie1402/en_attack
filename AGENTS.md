# AGENTS.md — SnowGraph

## Mission
Implement SnowGraph, a single-player real-time mathematical tower-defense browser game. The owner approved the colorful, illustrated seasonal garden concept and the Én Việt pilot swallow reference. This repository is not a dashboard or a graphing calculator. The formula defines the actual projectile path; the board must look like a game.

## Required reading
At the start of each task read the current user instructions, this file, and these repository documents in order:
1. `.codex/01-GAME-DESIGN.md`
2. `.codex/02-MATH-ENGINE.md`
3. `.codex/03-ARCHITECTURE.md`
4. `.codex/04-UI-ART-DIRECTION.md` (also inspect `references/*.png` visually when working on art/UI)
5. `.codex/05-ENGINEERING-RULES.md`
6. `.codex/06-PHASE-PLAN.md`
7. `.codex/07-TEST-STRATEGY.md`
8. `.codex/08-PROGRESS.md` and `.codex/09-DECISIONS.md`
9. `.codex/10-CONTENT-BALANCE.md`
10. `.codex/11-ASSET-PIPELINE.md`

These Markdown files are explicitly referenced instructions, not automatically loaded just because they are under `.codex/`. `AGENTS.md` is the root entry point. If other applicable AGENTS.md files exist, respect their scope; reconcile conflicts without silently overwriting user work. Latest explicit owner decisions take precedence over defaults in this kit. Approved art/gameplay requirements take precedence over decorative details in concept images. If a conflict affects product semantics, record it and implement only a safe reversible default when possible; otherwise stop at the blocked item.

## Execution contract
- Inspect git status/tree and actual code; preserve unrelated changes. Start from Phase 00 if empty, otherwise reconcile progress with actual evidence.
- Implement one complete verified phase at a time. Continue through subsequent phases if execution budget permits. No generic planning-only response when code changes are requested.
- At each phase: read inputs, state approach, implement, run required checks, fix failures, record actual results and update `.codex/08-PROGRESS.md`. A failed required gate blocks advancement. Never mark skipped checks as passing.
- Domain/application code is framework-free TypeScript. One deterministic simulation owner. Phaser renders; React consumes low-frequency snapshots and sends commands. No per-frame React state, duplicate damage or gravity-based paths.
- Strict TypeScript; no `any`, `eval`, `new Function`, arbitrary expression evaluation or unbounded math. No scattered balance constants. No unsafe save loading.
- Default UI Vietnamese, optional English. Keep user-visible strings localized. No coordinate axes on campaign board. Preserve square cells and exact mapping.
- Use original local game assets; mascot and concept references are not production sprite sheets. No screenshot-as-game-background workaround, no ripping PvZ/Graphwar assets, no hotlinking. Never report temporary artwork as final.
- Use `npm ci`, lint, formatting, typecheck, tests, production build and browser acceptance checks as applicable. Record exact outputs, not imagined results. Do not commit/push/deploy or delete user files without permission. No paid services, tracking, accounts, or backend unless explicitly authorized.

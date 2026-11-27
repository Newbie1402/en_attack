# 03 — Architecture / contracts

## Stack and boundaries
Use the stack in SUPER_PROMPT. Select compatible exact versions, lockfile, Node active LTS and package engines; record in ADR after checking registry/docs. Phaser 3 owns canvas, scene lifecycle, sprite animations, effects and audio; React owns accessible menus, HUD, editor, placement/skill UI. Zustand stores selection, editor text, settings and read-only snapshot projections, never mutable simulation state. React Router v6: `/`, `/campaign`, `/play/:levelId`, `/sandbox`, `/bestiary`, `/settings`. Static SPA deploy with route fallback. Zod parses level and save data at boundary. math.js used only to parse, no dynamic evaluation. Pure TypeScript core with no Phaser/React/DOM imports. No backend for MVP.

```text
src/
  app/                 # entry, router, providers, app layout
  pages/               # menu, campaign, play, sandbox, bestiary, settings
  components/          # common accessible controls, UI primitives
  features/
    formula-editor/    # input, hints, syntax, error display
    battlefield-hud/   # shop, wave, skills, lives
    campaign/          # world map and progress projection
  game/
    domain/
      math/            # normalize, AST -> IR, safe evaluator, interval, sampler, quotas
      board/           # cells, world transforms, occupancy
      combat/          # swept collision, armor, projectiles, damage
      entities/        # units, enemies, pickups types and factories
      economy/         # costs, production, collection
      skills/          # effects and clocks
      waves/           # scheduler, enemies, boss transitions
      simulation/      # state, step, command handlers, seeded RNG
    application/       # session/controller, commands, events, snapshots, selectors
    infrastructure/    # level loader, persistence, audio adapter contracts
    presentation/
      phaser/          # scene, assets, sprite mapping, effects, inputs, resize
      bridge/          # game <-> React integration, disposal
  content/
    levels/            # authored JSON/TS data, schema
    units/             # balance config
    enemies/
    themes/            # asset manifest references, tile variants
  stores/              # UI/read-model Zustand
  i18n/                # vi, en dictionaries
  styles/              # tokens, Tailwind, fonts
  types/               # shared UI/DTO types only where needed
  utils/               # non-domain helpers
public/assets/         # sprites, tiles, UI, sound, fonts and manifests
references/            # source images, not shipped as runtime assets
tests/                # integration, fixtures and e2e
 docs/                 # ADR extensions, screenshots, reports, asset provenance
```

## Runtime flow
`React/Phaser input -> typed Command -> GameSession queue -> fixed-step Simulation -> GameEvent[] + readonly state -> Phaser frame rendering + throttled immutable HUD snapshot -> React`. All mutations only through simulation/application owner. Commands queued at tick boundary in stable order; accepted/rejected result includes id and reason. Pause/resume handled in session while no ticks run; queued gameplay commands cannot execute while paused. Domain rejects commands in invalid mode. New session seeded, explicit dispose of scenes/listeners/workers/timers, route unmount; use lifecycle safe under React StrictMode. One RAF owner; no independent React interval driving combat. Fixed dt=1/60, max 5 catch-up ticks/frame; drop excess accumulated wall time with debug metric, pause when hidden. Use integer ticks for deadlines. RNG state serialized for deterministic tests; no `Math.random` in domain. Render interpolation visual only. React snapshot event-driven plus max ~10Hz for changing counters; no entity position arrays sent at 60Hz. Formula preview uses same sampler, derived from state, stale results discarded by request id.

## Contracts (illustrative)
```ts
type Vec2 = Readonly<{x: number; y: number}>;
type Cell = Readonly<{col: number; row: number}>;
type Command =
 | {type:'Start'} | {type:'PlaceUnit'; kind: UnitKind; cell: Cell}
 | {type:'MoveUnit'; unitId: string; cell: Cell}
 | {type:'Fire'; unitId: string; expression: string}
 | {type:'CollectPickup'; pickupId: string}
 | {type:'UseSkill'; skill: SkillKind; bucketId?: string};
```
Define discriminated command results and typed events (`ShotFired`, `Hit`, `UnitPlaced`, `PickupSpawned`, `PickupCollected`, `PickupExpired`, `SkillActivated`, `FormulaLocked`, `WaveStarted`, `BossPhaseChanged`, `MatchEnded`, `CommandRejected`). Event id monotonic per session; presentation dedup on replay. Preview never mutates state. IDs deterministic counter or seeded scheme. State includes tick, mode, board, energy, hearts, entities, cooldowns, stock, effects, formula registry, wave state, rng, pending boosts, result. Use exact typed config validated on load, bounds and referential integrity. Config version plus seed in test replay.

## Tick ordering
Apply ordered commands; expire active effects/pickups at tick boundary (deadline is exclusive; command handler also verifies deadline); schedule waves and production; update enemies (save previous positions, clamp at breach line until collision evaluation); advance shots and resolve sorted swept contacts; apply damage/death, boss thresholds/adds; resolve surviving enemy breaches and hearts; determine match outcome; emit ordered events/snapshot. Tie rules deterministic; projectile processing stable launch id. Domain logic independent of frame rate. A shot that kills enemy at same tick as breach prevents breach if contact occurs before breach time; otherwise breach wins; compute time fraction for crossing and ignore later contacts. MVP no defender melee.

## Save and deploy
`SaveEnvelope {version, progress, settings}`; safe parse, explicit migrations, cap input size, recover defaults on corrupt/incompatible data with nonblocking notice; no formula AST or match state persisted. LocalStorage errors caught. No secrets or PII. Deployment: npm build -> static dist -> unprivileged Nginx port 8080, history fallback, immutable caching hashed assets, no-cache index, healthcheck. Docker build args no secrets; CSP verify runtime (no unsafe-eval), standard security headers, same-origin assets. CI verifies only; no auto deployment.

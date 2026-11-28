# SnowGraph — The Swallow Defense

SnowGraph is a single-player mathematical tower-defense game. The player writes `y=f(x)`
and fires a snowball along the sampled graph of that formula to protect a seasonal garden.

## Local development

Requires Node 20.19+ and npm 10+.

```bash
npm ci
npm run dev
```

Verification commands:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run verify
npm run test:e2e
```

## Container smoke test

The release image builds the static SPA with Node, serves it from unprivileged Nginx on port 8080,
keeps `/assets/*` immutable, and provides `/healthz` plus same-origin security headers.

```bash
docker build -t snowgraph:local .
docker run --rm -p 8080:8080 snowgraph:local
curl -fsS http://127.0.0.1:8080/healthz
```

The browser game is intentionally local-only: no backend, analytics, remote assets, or
authentication are used. Reference images remain in `references/` and are not runtime assets.

## Current controls

Phase 00 provides the route and Phaser lifecycle smoke test. The playable battlefield route is
available at `/play/L1`; the math editor and combat loop are implemented in the next phases.

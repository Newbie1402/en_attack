# 11 — Asset production and animation pipeline

## References and production boundary
`references/mascot-original.png` is the owner's supplied character design; other two PNGs are approved generated visual concepts. Keep them out of runtime `public/` and dist. Do not use a full screenshot as background with transparent buttons, nor extract existing game's artwork. Create distinct assets (image generation if available, otherwise original authored SVG/vector/procedural art). Verify source rights before public distribution; brand permission not inferred. Do not claim placeholder equals polished art. Do not require external AI/API keys at runtime.

## Inventory (MVP)
- Swallow basic, frost, heavy: consistent silhouette, pilot cap, scarf, forked tail; portrait for shop plus transparent in-game sprites facing right. Frost blue details, heavy larger snowball, still recognizable.
- Fox, boar armor, raven, guardian boss facing left; portrait and in-game sprites. Clear health bars rendered separately; boss phase cues.
- Lucky Nest (idle, egg charging/crack/pop), energy token, 4 skill icons + dropped world versions, snowballs, impact shards, trails, selection tile, obstacles, decorative scenery.
- Spring and winter boards with tile variants, separate background/foreground layers, water/foliage/snow accents. Tiles square, visual perspective in sprites only. Menu/world-map illustration, wood/parchment panels, button states. No text baked into images. Future theme packs separate.
- Local sound effects: fire, impact, collect, skill, error, win/loss, ambient music if rights available; procedural original audio acceptable. Volume/mute independent and no autoplay until gesture.

## Asset contract
Use manifest JSON/TS validated by Zod: logical key, file paths, kind, dimensions/frame dimensions or atlas keys, anchor (normally ground center; projectile center), animation clips `{frames,fps,loop}`, theme, source/license/provenance. Relative same-origin URLs through Vite base. PNG/WebP transparent, consistent sprite scale, texture atlas with padding to avoid bleeding, no oversized sprite sheets. Initial authoring 256x256 per small character frame (128 or smaller runtime if clear), boss 512x512; target display ~0.85–1.0 tile for regular, boss may overlap visually while collision remains configured. Natural tile art 128x128, square. Source art separate from optimized runtime; use licensed fonts, document licenses. Provide `docs/asset-inventory.md` with file, creation source, license/permission status, placeholder status.

## Animation clips (minimum visual behavior)
Swallow idle loop (blink/breathe), throw (anticipation/release/recover), move hop/land, victory; fox/boar/raven idle/walk/flight, hit/death/frozen, boss phase telegraph. Nest idle, charge (last ~1s before production), crack/pop, pickup bounce, float, expire blink, collect flight and HUD pulse. Use sprites or hand-crafted rig/tweens, not a stationary icon with a single fade for everything. Suggested timings: anticipation 100–150ms cosmetic, pop/arc 400ms, bounce 200ms, float cycle 1.4s, collect-to-HUD 300–450ms; no state mutation from tween completion. Trigger events by domain; if visuals skip or reduced motion, gameplay still correct. Skill icon and color must remain readable over all terrain; large enough hit target, z-order above board and below modal. On resize update target HUD coordinates for collection animation or safely finish; no duplicate credit.

## Verification
Asset manifest integrity, missing texture check, no remote requests, actual animation inspection and screenshots in 08 gate. No production screenshot compositing. Art quality is subjective: owner approval remains required before final public release; report tool/asset limitations and concrete differences from references.

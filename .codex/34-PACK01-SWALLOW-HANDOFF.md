# 34 — Art handoff: Pack 01, Swallow family v1

## Authority and scope

Approved reference: the original pilot swallow mascot and the approved SnowGraph seasonal garden gameplay concept. Existing gameplay and architecture remain authoritative. This pack changes artwork and presentation only; it does not change attack timing, balance, ownership, collision, or formula math.

The supplied art is original generated imagery based on the approved mascot, not extracted from the concept screenshot. Exact brand logo lettering is intentionally omitted at gameplay scale; public distribution still requires a rights review.

## Visual brief and design decisions

Illustrated chibi cartoon 2D, warm daylight, orthographic gameplay on a square board. Three-quarter side view, facing right, recognizable cap and scarf, oversized eye, cream face and belly, forked tail.

- Standard: orange scarf and wing accents.
- Frost: blue scarf, snowflake insignia, icy wing edges.
- Heavy: fuller silhouette and gold shoulder plates.

Palette targets: navy `#28354F`, outline `#222337`, cream `#FFF2E3`, orange `#F47C24`, gold `#F7B94A`, frost blue `#328DDF`, icy highlight `#AEE9FF`. Light comes from the upper-left/front with soft cel shading, narrow warm highlights, controlled dark outlines, and rounded forms.

Do not bake UI, health bars, glow, or permanent shadows into sprites. Keep a separate ground shadow in the renderer. Color is not the only differentiator: use the snowflake motif and icy accents for frost, gold shoulder protection for heavy, and the plain orange scarf for standard.

## Reusable generation prompt

Create original production sprite artwork for SnowGraph in a bright hand-illustrated chibi cartoon 2D casual tower-defense style. Use bold consistent dark navy outlines, clean cel shading, warm upper-left daylight, a three-quarter right-facing pilot swallow, large expressive eye, cream belly, short orange beak, pilot cap with generic gold wing badge, orange scarf, and forked tail.

Create three coherent variants: standard with orange scarf; frost with blue scarf, snowflake insignia, and icy blue feather accents; heavy with a fuller silhouette, gold shoulder guards, and a larger snowball. Keep cap, eye size, beak, foot positions, head/body proportions, line weights, and palette consistent across each row.

Produce a transparent RGBA sheet with equal cells, 4 columns × 3 rows, no labels, border, scenery, cast shadow, or detached particles. Row order: standard, frost, heavy. Column order: idle (open eye, empty wings), charge (snowball held, anticipation), release (wing extended, no projectile baked in), recovery (smile, wings lowered). Keep every subject inside its cell with transparent padding, a common ground baseline, and no clipped tails or wings. Do not add brand lettering or watermark. Keep art readable at 64–96 screen pixels. Export actual alpha and review every extracted frame.

## Delivered files and status

The handoff specifies these intended runtime paths:

`public/assets/characters/swallows/{normal,frost,heavy}/{idle,charge,release,recovery,poses,portrait}.png`

Each pose is intended to be an independent 256×256 RGBA image; `poses.png` is an exact 4×1 sheet at 1024×256, with zero margin and spacing. Portrait is a derived 192×192 idle thumbnail. The original frame grid is 4×3. The estimated common ground anchor is `x=0.46875`, `y=0.921875`; all poses face right.

Current classification from the art handoff: `Runtime Candidate v1`, `needs-revision`, and not production final. The complete v1.1 bundle now contains the individual PNG files and 4×1 pose sheets in the intended runtime paths. They are integrated with an SVG fallback and have passed file, type, unit, browser, and build checks; visual art approval, licensing review, and long-session profiling remain open.

## Animation contract

| State | Frame | Timing | Loop | Trigger |
|---|---:|---|---|---|
| Idle | 0 | 1400–1800 ms breathing tween | yes | deployed / ready / cooldown |
| Charge | 1 | hold until authoritative release or cancellation | no | attack windup |
| Release | 2 | 100 ms initial cosmetic hold | no | projectile emitted |
| Recovery | 3 | 140 ms initial cosmetic hold | no | release presentation ends |
| Relocate | 0 | ~180 ms cosmetic hop if allowed | no | confirmed move |
| Victory | 3 | ~600 ms soft bounce | yes while visible | level won |
| Blink | none | omitted in v1 | no | future clip |

These are four distinct poses, not full frame-by-frame animation. The next revision target is idle 6 frames at 6–8 fps, blink 3 frames at 10–12 fps, charge 4–6 frames, release 4–6 frames at 18–24 fps, recovery 4 frames at 12–16 fps, and victory 6–8 frames at 8–10 fps.

Cosmetic animation must never spawn projectiles or apply damage. Never extend a simulation cooldown to finish an animation. If windup is cancelled, restore idle immediately. Cancel tweens on state change, pause, removal, or restart.

## Gameplay readability and geometry

- Start with display height `1.02 × tilePx`, preserving 1:1 sprite proportions.
- Test at 64, 80, and 96 px tiles.
- Use the handoff anchor only for visual placement; keep the mathematical projectile origin and collision reference unchanged.
- Keep placement/select hit areas authoritative in the grid or hit shape. Never use sprite alpha as a collision mask.
- Keep shadows, selection rings, formula tooltips, status, and cooldown as separate layers.
- Heavy shoulder plates are decorative and must not imply an unimplemented armor stat.

## Phaser integration contract

Use the existing runtime manifest and Vite asset helper. If the PNGs arrive, load one 4×1 spritesheet per variant with frame size 256×256 and no margin or spacing. Set the visual origin to `(0.46875, 0.921875)`, reuse loaded textures, and update the frame only when the relevant state changes. Keep the simulation event as the authority for shot release and preserve the current fallback path if a texture fails to load.

Do not create a second game loop. Reduced motion may disable decorative tweening but must preserve pose changes. Do not load both individual poses and atlases at runtime unless the integration requires it.

## QA and rejection gate

Reject any file with clipped wings, conspicuous halos, inconsistent hats, foot jumping, unreadable variants at tile size, oversized padding, duplicate snowballs, stale animation after pause/restart, or unintended changes to trajectory or damage. Browser QA was not included in the art handoff; repository integration now has browser coverage for authored swallow, enemy, terrain, and UI visibility through the existing Playwright flows.

Required evidence once the PNGs are available:

- idle, charge, release, and recovery;
- all three variants on one battlefield;
- shop and placement ghost;
- automatic combat during an active wave;
- spring and winter environments;
- 1440×900 and 1280×720 screenshots;
- actual lint, typecheck, unit, E2E, and production-build results;
- observed jitter, rejected assets, performance notes, and rights review.

Do not mark the pack production-ready until the remaining visual approval, rights review, and performance checks pass.

## Next packs

P02 enemies (fox, rabbit, armored boar, crystal turtle, raven, frost wolf); P03 spring/winter tiles and environment vertical slice; P04 nest and pickups; P05 projectiles and combat feedback; P06 UI frames, icons, and final polish.

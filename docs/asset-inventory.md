# SnowGraph asset inventory

The machine-readable inventory lives under `public/assets/manifests/`. This table summarizes what is
actually in the repository today.

| Group        | Integrated files                                               | Status     | Notes                                                          |
| ------------ | -------------------------------------------------------------- | ---------- | -------------------------------------------------------------- |
| Swallows     | `swallow-normal.svg`, `swallow-frost.svg`, `swallow-heavy.svg` | first-pass | Local single-frame SVGs; gameplay bob/recoil is cosmetic.      |
| Lucky Nest   | `nest-lucky.svg`                                               | first-pass | Production and pickup lifecycle are simulation-backed.         |
| Enemies      | fox, rabbit, boar, turtle, raven, wolf and guardian SVGs       | first-pass | Distinct mechanics and local silhouettes; atlas clips pending. |
| Pickups      | `energy.svg`, `skill.svg`                                      | first-pass | Shared skill bundle art; per-skill art pending.                |
| Projectile   | `snowball.svg`                                                 | first-pass | Shared projectile art; frost/heavy variants pending.           |
| Environments | spring and winter backdrop SVGs                                | first-pass | Board tiles remain runtime-generated square variations.        |
| UI           | CSS HUD, shop, lab, skills and result surfaces                 | first-pass | No baked text or remote UI art.                                |
| Audio        | none                                                           | pending    | No autoplay or fake audio wiring.                              |

Run `npm run assets:check` to validate manifest ids and local files. Run the browser suite to verify that
the runtime loader only requests files classified as present.

The generated Pack 01 concept previews are stored at `artifacts/asset-preview/pack-01-swallow-contact-sheet.png`
and `artifacts/asset-preview/pack-01-swallow-contact-sheet-v1.jpg`. The art handoff contract is preserved at
`.codex/34-PACK01-SWALLOW-HANDOFF.md`. They are QA/reference evidence only; runtime still uses the reviewed
local SVG files because the handoff's individual PNG frames and atlases are not present in this checkout.

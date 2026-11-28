# Asset manifest specification

`public/assets/manifests/asset-manifest.json` is the machine-readable source of asset status for tooling.
Each entry uses:

- `id`: stable logical identifier.
- `kind` and `variant`: gameplay category and visual role.
- `file`: same-origin `/assets/...` path; pending external authoring may point to a planned path.
- `frameWidth`, `frameHeight`, `frames`, `pivot`: runtime geometry when available.
- `status`: `first-pass`, `ready`, `needs-revision`, or `external-authoring-pending`.

Runtime Phaser loading uses the typed `src/presentation/assets/assetManifest.ts` subset so missing pending
files cannot become runtime 404s. `npm run assets:check` validates unique ids, local paths and every
non-pending file. No remote URLs, embedded screenshots or text-baked gameplay images are allowed.

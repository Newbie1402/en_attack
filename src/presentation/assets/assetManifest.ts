export interface RuntimeAsset {
  readonly key: string;
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

/** Runtime-ready local art only; pending packs stay in the public manifest. */
export const runtimeAssetManifest: readonly RuntimeAsset[] = [
  {
    key: 'swallow-normal',
    file: '/assets/characters/swallows/normal/swallow-normal.svg',
    width: 160,
    height: 128,
  },
  {
    key: 'swallow-frost',
    file: '/assets/characters/swallows/frost/swallow-frost.svg',
    width: 160,
    height: 128,
  },
  {
    key: 'swallow-heavy',
    file: '/assets/characters/swallows/heavy/swallow-heavy.svg',
    width: 176,
    height: 144,
  },
  {
    key: 'nest-lucky',
    file: '/assets/characters/swallows/nest-lucky.svg',
    width: 160,
    height: 128,
  },
  { key: 'enemy-fox', file: '/assets/characters/enemies/fox/fox.svg', width: 144, height: 128 },
  {
    key: 'enemy-rabbit',
    file: '/assets/characters/enemies/rabbit/rabbit.svg',
    width: 144,
    height: 128,
  },
  { key: 'enemy-boar', file: '/assets/characters/enemies/boar/boar.svg', width: 176, height: 144 },
  {
    key: 'enemy-turtle',
    file: '/assets/characters/enemies/turtle/turtle.svg',
    width: 176,
    height: 144,
  },
  {
    key: 'enemy-raven',
    file: '/assets/characters/enemies/raven/raven.svg',
    width: 160,
    height: 144,
  },
  { key: 'enemy-wolf', file: '/assets/characters/enemies/wolf/wolf.svg', width: 176, height: 144 },
  {
    key: 'enemy-guardian',
    file: '/assets/characters/enemies/boss/guardian.svg',
    width: 224,
    height: 192,
  },
  { key: 'pickup-energy', file: '/assets/pickups/energy.svg', width: 80, height: 80 },
  { key: 'pickup-skill', file: '/assets/pickups/skill.svg', width: 80, height: 80 },
  { key: 'projectile-snowball', file: '/assets/projectiles/snowball.svg', width: 64, height: 64 },
  {
    key: 'environment-spring',
    file: '/assets/environments/spring/garden-backdrop.svg',
    width: 1200,
    height: 600,
  },
  {
    key: 'environment-winter',
    file: '/assets/environments/winter/valley-backdrop.svg',
    width: 1200,
    height: 600,
  },
];

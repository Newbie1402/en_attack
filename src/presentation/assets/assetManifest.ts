export type RuntimeAssetKind = 'svg' | 'image' | 'spritesheet' | 'audio';

export interface RuntimeAsset {
  readonly key: string;
  readonly file: string;
  readonly kind: RuntimeAssetKind;
  readonly width: number;
  readonly height: number;
  readonly frameWidth?: number;
  readonly frameHeight?: number;
}

const svg = (key: string, file: string, width: number, height: number): RuntimeAsset => ({
  key,
  file,
  kind: 'svg',
  width,
  height,
});

const image = (key: string, file: string, width: number, height: number): RuntimeAsset => ({
  key,
  file,
  kind: 'image',
  width,
  height,
});

const spritesheet = (
  key: string,
  file: string,
  frameWidth: number,
  frameHeight: number,
  frameCount: number,
): RuntimeAsset => ({
  key,
  file,
  kind: 'spritesheet',
  width: frameWidth * frameCount,
  height: frameHeight,
  frameWidth,
  frameHeight,
});

const audio = (key: string, file: string): RuntimeAsset => ({
  key,
  file,
  kind: 'audio',
  width: 1,
  height: 1,
});

const swallowVariants = ['normal', 'frost', 'heavy'] as const;
const swallowAssets = swallowVariants.flatMap((variant) => [
  spritesheet(
    `swallow-${variant}-poses`,
    `/assets/characters/swallows/${variant}/poses.png`,
    256,
    256,
    4,
  ),
  image(
    `swallow-${variant}-portrait`,
    `/assets/characters/swallows/${variant}/portrait.png`,
    192,
    192,
  ),
]);

const enemyAssets = [
  ['fox', 'fox'],
  ['rabbit', 'rabbit'],
  ['boar', 'armored-boar'],
  ['turtle', 'crystal-turtle'],
  ['raven', 'raven'],
  ['wolf', 'frost-wolf'],
] as const;

const authoredEnemyAssets = enemyAssets.flatMap(([kind, folder]) => [
  image(`enemy-${kind}-authored`, `/assets/characters/enemies/${folder}/idle.png`, 256, 256),
  image(`enemy-${kind}-portrait`, `/assets/characters/enemies/${folder}/portrait.png`, 192, 192),
]);

const terrainAssets = [
  ...Array.from({ length: 6 }, (_, index) =>
    image(`tile-spring-${index + 1}`, `/assets/tilesets/spring/ground-0${index + 1}.png`, 128, 128),
  ),
  ...Array.from({ length: 6 }, (_, index) =>
    image(`tile-winter-${index + 1}`, `/assets/tilesets/winter/ground-0${index + 1}.png`, 128, 128),
  ),
  image('scenic-spring', '/assets/environments/spring/scenic-strip.png', 1024, 198),
  image('scenic-winter', '/assets/environments/winter/scenic-strip.png', 1024, 198),
];

const pickupAssets = [
  ['energy', 'energy'],
  ['slow', 'slow'],
  ['freeze', 'freeze'],
  ['damage', 'damage-boost'],
  ['reset', 'formula-reset'],
  ['relocate', 'relocate'],
] as const;

const authoredPickupAssets = pickupAssets.flatMap(([key, folder]) => [
  image(`pickup-${key}-authored`, `/assets/pickups/${folder}/collectible.png`, 128, 128),
  image(`pickup-${key}-hud`, `/assets/pickups/${folder}/hud.png`, 64, 64),
]);

const vfxAssets = [
  ['hit', 6],
  ['freeze', 6],
  ['armor-break', 6],
  ['shield', 6],
  ['defeat', 6],
  ['pickup-sparkle', 6],
] as const;

const authoredVfxAssets = [
  ...vfxAssets.map(([key, frameCount]) =>
    spritesheet(`vfx-${key}`, `/assets/effects/${key}/frames.png`, 256, 256, frameCount),
  ),
  image('vfx-snow-particle', '/assets/effects/trails/snow-particle.png', 64, 64),
];

const uiAssets = [
  ['ui-panel-wood', 'panel-wood.png', 192, 128],
  ['ui-button-primary', 'button-primary.png', 192, 80],
  ['ui-button-secondary', 'button-secondary.png', 192, 80],
  ['ui-button-disabled', 'button-disabled.png', 192, 80],
  ['ui-tooltip', 'tooltip.png', 192, 80],
  ['ui-bar-frame', 'bar-frame.png', 192, 48],
  ['ui-heart', 'heart.png', 128, 128],
] as const;

const authoredUiAssets = uiAssets.map(([key, file, width, height]) =>
  image(key, `/assets/ui/${file}`, width, height),
);

const audioAssets = [
  audio('audio-music-garden', '/assets/audio/music/garden-sketch-loop.wav'),
  audio('audio-sfx-armor-break', '/assets/audio/sfx/armor-break.wav'),
  audio('audio-sfx-defeat', '/assets/audio/sfx/defeat.wav'),
  audio('audio-sfx-freeze', '/assets/audio/sfx/freeze.wav'),
  audio('audio-sfx-impact', '/assets/audio/sfx/impact.wav'),
  audio('audio-sfx-pickup', '/assets/audio/sfx/pickup.wav'),
  audio('audio-sfx-place', '/assets/audio/sfx/place.wav'),
  audio('audio-sfx-select', '/assets/audio/sfx/select.wav'),
  audio('audio-sfx-throw', '/assets/audio/sfx/throw.wav'),
  audio('audio-sfx-victory', '/assets/audio/sfx/victory.wav'),
];

export const runtimeAssetManifest: readonly RuntimeAsset[] = [
  svg('swallow-normal-fallback', '/assets/characters/swallows/normal/swallow-normal.svg', 160, 128),
  svg('swallow-frost-fallback', '/assets/characters/swallows/frost/swallow-frost.svg', 160, 128),
  svg('swallow-heavy-fallback', '/assets/characters/swallows/heavy/swallow-heavy.svg', 176, 144),
  svg('swallow-shield-fallback', '/assets/characters/swallows/shield/swallow-shield.svg', 176, 144),
  svg('swallow-fire-fallback', '/assets/characters/swallows/fire/swallow-fire.svg', 176, 144),
  svg('swallow-witch-fallback', '/assets/characters/swallows/witch/swallow-witch.svg', 176, 144),
  svg('nest-lucky-fallback', '/assets/characters/swallows/nest-lucky.svg', 160, 128),
  svg('enemy-fox-fallback', '/assets/characters/enemies/fox/fox.svg', 144, 128),
  svg('enemy-rabbit-fallback', '/assets/characters/enemies/rabbit/rabbit.svg', 144, 128),
  svg('enemy-boar-fallback', '/assets/characters/enemies/boar/boar.svg', 176, 144),
  svg('enemy-turtle-fallback', '/assets/characters/enemies/turtle/turtle.svg', 176, 144),
  svg('enemy-raven-fallback', '/assets/characters/enemies/raven/raven.svg', 160, 144),
  svg('enemy-wolf-fallback', '/assets/characters/enemies/wolf/wolf.svg', 176, 144),
  svg(
    'enemy-wallJumper-fallback',
    '/assets/characters/enemies/wall-jumper/wall-jumper.svg',
    176,
    144,
  ),
  svg('enemy-iceGuard-fallback', '/assets/characters/enemies/ice-guard/ice-guard.svg', 176, 144),
  svg('enemy-guardian-fallback', '/assets/characters/enemies/boss/guardian.svg', 224, 192),
  svg('pickup-energy-fallback', '/assets/pickups/energy.svg', 80, 80),
  svg('pickup-skill-fallback', '/assets/pickups/skill.svg', 80, 80),
  svg('projectile-snowball-fallback', '/assets/projectiles/snowball.svg', 64, 64),
  svg('projectile-fire-fallback', '/assets/projectiles/fireball.svg', 72, 72),
  svg('projectile-hex-fallback', '/assets/projectiles/hex-orb.svg', 72, 72),
  svg('projectile-ward-fallback', '/assets/projectiles/ward-orb.svg', 72, 72),
  svg('environment-spring-fallback', '/assets/environments/spring/garden-backdrop.svg', 1200, 600),
  svg('environment-winter-fallback', '/assets/environments/winter/valley-backdrop.svg', 1200, 600),
  ...swallowAssets,
  ...authoredEnemyAssets,
  ...terrainAssets,
  image('nest-lucky-authored', '/assets/nests/lucky-nest/idle.png', 256, 256),
  image('nest-lucky-portrait', '/assets/nests/lucky-nest/portrait.png', 192, 192),
  image('nest-crack-overlay', '/assets/nests/lucky-nest/crack-overlay.png', 128, 128),
  image('nest-shell-fragment', '/assets/nests/lucky-nest/shell-fragment.png', 128, 128),
  ...authoredPickupAssets,
  image('projectile-snowball-normal', '/assets/projectiles/snowball-normal/sprite.png', 128, 128),
  image('projectile-snowball-frost', '/assets/projectiles/snowball-frost/sprite.png', 128, 128),
  image('projectile-snowball-heavy', '/assets/projectiles/snowball-heavy/sprite.png', 128, 128),
  ...authoredVfxAssets,
  ...authoredUiAssets,
  ...audioAssets,
];

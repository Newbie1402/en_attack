import { describe, expect, it } from 'vitest';

import { runtimeAssetManifest } from './assetManifest';

describe('runtime asset manifest', () => {
  it('has unique Phaser keys and local same-origin files', () => {
    const keys = runtimeAssetManifest.map((asset) => asset.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(runtimeAssetManifest.every((asset) => asset.file.startsWith('/assets/'))).toBe(true);
    expect(runtimeAssetManifest.every((asset) => asset.width > 0 && asset.height > 0)).toBe(true);
  });

  it('includes authored runtime sheets, terrain, effects, and audio', () => {
    const keys = new Set(runtimeAssetManifest.map((asset) => asset.key));

    expect(keys.has('swallow-normal-poses')).toBe(true);
    expect(keys.has('tile-winter-6')).toBe(true);
    expect(keys.has('vfx-hit')).toBe(true);
    expect(keys.has('audio-sfx-throw')).toBe(true);
    expect(runtimeAssetManifest.filter((asset) => asset.kind === 'spritesheet')).not.toHaveLength(
      0,
    );
  });
});

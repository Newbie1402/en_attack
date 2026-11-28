/* global console, process */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const manifestPath = resolve(root, 'public/assets/manifests/asset-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (!Array.isArray(manifest.assets)) throw new Error('asset manifest must contain an assets array');

const ids = new Set();
const errors = [];
for (const asset of manifest.assets) {
  if (typeof asset.id !== 'string' || ids.has(asset.id))
    errors.push(`duplicate or invalid id: ${asset.id}`);
  ids.add(asset.id);
  if (typeof asset.file !== 'string' || !asset.file.startsWith('/assets/')) {
    errors.push(`${asset.id}: file must be a same-origin /assets/ path`);
    continue;
  }
  if (asset.status === 'external-authoring-pending') continue;
  const localPath = resolve(root, 'public', `.${asset.file}`);
  if (!existsSync(localPath)) errors.push(`${asset.id}: missing ${asset.file}`);
}

if (errors.length > 0) throw new Error(`Asset manifest failed:\n${errors.join('\n')}`);
console.log(`Asset manifest valid: ${manifest.assets.length} entries; ${ids.size} unique ids.`);

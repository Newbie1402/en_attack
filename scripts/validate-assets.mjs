/* global console, process */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

const manifestDir = resolve(root, 'public/assets/manifests');
const packManifests = readdirSync(manifestDir).filter((file) => /^pack\d.*\.json$/.test(file));
const packErrors = [];
const collectFiles = (value) => {
  if (Array.isArray(value)) return value.flatMap(collectFiles);
  if (value === null || typeof value !== 'object') return [];
  const files = typeof value.file === 'string' ? [value.file] : [];
  return files.concat(Object.values(value).flatMap(collectFiles));
};
for (const file of packManifests) {
  const pack = JSON.parse(readFileSync(resolve(manifestDir, file), 'utf8'));
  for (const assetFile of collectFiles(pack)) {
    const relativeFile = assetFile.replace(/^\//, '');
    const localPath = resolve(
      root,
      'public',
      relativeFile.startsWith('assets/') ? relativeFile : `assets/${relativeFile}`,
    );
    if (!existsSync(localPath)) packErrors.push(`${file}: missing ${assetFile}`);
  }
}

if (packErrors.length > 0)
  throw new Error(`Pack asset manifests failed:\n${packErrors.join('\n')}`);
console.log(
  `Asset manifests valid: ${manifest.assets.length} base entries; ${ids.size} unique ids; ${packManifests.length} pack manifests checked.`,
);

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function manifest(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

test('declares the four LifeOS workspace packages with a shared contracts boundary', async () => {
  const packages = await Promise.all([
    manifest('apps/mobile/package.json'),
    manifest('apps/api/package.json'),
    manifest('apps/workers/package.json'),
    manifest('packages/contracts/package.json'),
  ]);

  assert.deepEqual(
    packages.map(({ name }) => name),
    ['@lifeos/mobile', '@lifeos/api', '@lifeos/workers', '@lifeos/contracts'],
  );

  for (const app of packages.slice(0, 3)) {
    assert.equal(app.dependencies['@lifeos/contracts'], 'workspace:*');
  }
});

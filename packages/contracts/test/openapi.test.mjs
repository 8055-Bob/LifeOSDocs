import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.join(directory, '..', 'openapi', 'v1.json');

test('publishes a versioned Life Record draft contract', async () => {
  const spec = JSON.parse(await readFile(specPath, 'utf8'));
  const operation = spec.paths['/v1/life-records'].post;

  assert.equal(spec.openapi, '3.1.0');
  assert.equal(operation.operationId, 'createLifeRecord');
  assert.equal(operation.requestBody.required, true);
  assert.equal(operation.responses['201'].description, 'Life Record created');
  assert.equal(operation.responses['400'].$ref, '#/components/responses/ValidationError');
  assert.equal(spec.components.schemas.LifeRecordDraft.properties.status.const, 'draft');
});

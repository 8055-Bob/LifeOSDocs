import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryAgent } from '../src/memory-agent.js';

test('creates a proposed memory update instead of editing knowledge', async () => {
  const agent = new MemoryAgent({
    propose: async () => ({ operation: 'add', type: 'goal', value: 'Запустить бизнес', confidence: 0.71 }),
  });

  const proposal = await agent.run({ recordId: 'record_1', text: 'Я хочу запустить свой бизнес.' });

  assert.deepEqual(proposal, {
    recordId: 'record_1',
    operation: 'add',
    type: 'goal',
    value: 'Запустить бизнес',
    confidence: 0.71,
    status: 'proposed',
    createdAt: proposal.createdAt,
  });
});

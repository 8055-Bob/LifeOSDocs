import assert from 'node:assert/strict';
import test from 'node:test';
import { TopicEntityAgent } from '../src/topic-entity-agent.js';

test('returns topics and entity candidates as an artifact', async () => {
  const agent = new TopicEntityAgent({
    analyze: async () => ({
      topics: ['работа', 'финансы'],
      entities: [{ type: 'person', name: 'Анна' }],
      confidence: 0.78,
    }),
  });

  const artifact = await agent.run({ recordId: 'record_1', text: 'Я обсудил с Анной работу и деньги.' });

  assert.equal(artifact.agentName, 'topic_entity');
  assert.deepEqual(artifact.result.topics, ['работа', 'финансы']);
  assert.deepEqual(artifact.result.entities, [{ type: 'person', name: 'Анна' }]);
});

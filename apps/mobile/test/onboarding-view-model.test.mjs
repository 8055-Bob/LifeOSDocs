import assert from 'node:assert/strict';
import test from 'node:test';
import { createOnboardingViewModel } from '../src/onboarding-view-model.js';

test('offers an optional voice or text life-story prompt without blocking app access', () => {
  const model = createOnboardingViewModel({ displayName: 'Alex' });

  assert.equal(model.greeting, 'Welcome, Alex');
  assert.equal(model.story.canUseVoice, true);
  assert.equal(model.story.canUseText, true);
  assert.equal(model.story.canSkip, true);
  assert.equal(model.story.requiresConfirmationBeforeSavingProfile, true);
});

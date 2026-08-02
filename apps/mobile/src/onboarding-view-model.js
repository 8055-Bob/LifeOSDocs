export function createOnboardingViewModel({ displayName }) {
  return {
    greeting: `Welcome, ${displayName}`,
    story: {
      prompt: 'Tell your story in your own words. You can edit what I understand.',
      canUseVoice: true,
      canUseText: true,
      canSkip: true,
      requiresConfirmationBeforeSavingProfile: true,
    },
  };
}

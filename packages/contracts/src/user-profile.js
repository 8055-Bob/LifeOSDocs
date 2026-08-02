export function createUserProfile({ id, email }) {
  if (!id?.trim()) {
    throw new Error('id is required');
  }

  if (!email?.trim()) {
    throw new Error('email is required');
  }

  return {
    id,
    email: email.trim().toLowerCase(),
    consents: {
      audioStorage: false,
      productImprovement: false,
      proactiveNotifications: false,
    },
  };
}

export function updateUserConsents(profile, changes) {
  const allowed = new Set(['audioStorage', 'productImprovement', 'proactiveNotifications']);

  for (const key of Object.keys(changes)) {
    if (!allowed.has(key)) {
      throw new Error(`Unknown consent: ${key}`);
    }
  }

  return {
    ...profile,
    consents: {
      ...profile.consents,
      ...changes,
    },
  };
}

export function loadRuntimeConfig(environment) {
  const sessionSecret = environment.LIFEOS_SESSION_SECRET?.trim();

  if (!sessionSecret) {
    throw new Error('LIFEOS_SESSION_SECRET is required');
  }

  return {
    environment: environment.NODE_ENV ?? 'development',
    sessionSecret,
  };
}

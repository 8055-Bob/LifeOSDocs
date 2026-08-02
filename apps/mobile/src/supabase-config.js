function required(value, name) {
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value;
}

export function getSupabasePublicConfig(environment = process.env) {
  return {
    url: required(environment.EXPO_PUBLIC_SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL'),
    publishableKey: required(environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  };
}

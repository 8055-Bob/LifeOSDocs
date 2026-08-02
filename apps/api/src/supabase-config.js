function required(value, name) {
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value;
}

export function getSupabaseServerConfig(environment = process.env) {
  return {
    url: required(environment.SUPABASE_URL, 'SUPABASE_URL'),
    secretKey: required(environment.SUPABASE_SECRET_KEY, 'SUPABASE_SECRET_KEY'),
  };
}

const SESSION_KEY = 'lifeos.session.v1';

export function createSessionStore(storage) {
  return {
    async load() {
      const raw = await storage.getItemAsync(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    async save(session) {
      await storage.setItemAsync(SESSION_KEY, JSON.stringify(session));
    },
    async clear() {
      await storage.deleteItemAsync(SESSION_KEY);
    },
  };
}

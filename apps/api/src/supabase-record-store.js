function assertOk(response, operation) {
  if (response.ok) return;
  throw new Error(`Supabase ${operation} failed (status ${response.status})`);
}

async function parseJson(response) {
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

export class SupabaseRecordStore {
  #url;
  #secretKey;
  #fetch;

  constructor({ url, secretKey, fetchImpl = fetch }) {
    this.#url = url.replace(/\/$/, '');
    this.#secretKey = secretKey;
    this.#fetch = fetchImpl;
  }

  async saveAnalyzedRecord({ accessToken, text, mood, analysis }) {
    const user = await this.#getUser(accessToken);
    await this.#upsertProfile(user);
    const record = await this.#insertRecord({ userId: user.id, text, mood });
    await this.#insertAnalysisArtifact({ userId: user.id, recordId: record.id, analysis });
    return record;
  }

  async listJournalRecords({ accessToken }) {
    const user = await this.#getUser(accessToken);
    const parameters = new URLSearchParams({
      select: 'id,raw_text,transcript,mood,created_at,record_artifacts(result)',
      user_id: `eq.${user.id}`,
      status: 'eq.processed',
      order: 'created_at.desc',
      limit: '100',
    });
    const response = await this.#fetch(`${this.#url}/rest/v1/life_records?${parameters}`, {
      headers: this.#databaseHeaders('return=representation'),
    });
    assertOk(response, 'Life Record history read');
    const rows = await parseJson(response) ?? [];
    return rows.map((row) => ({
      id: row.id,
      text: row.raw_text ?? row.transcript ?? '',
      mood: row.mood,
      createdAt: row.created_at,
      analysis: row.record_artifacts?.[0]?.result ?? null,
    }));
  }

  async deleteJournalRecord({ accessToken, recordId }) {
    const user = await this.#getUser(accessToken);
    const parameters = new URLSearchParams({ id: `eq.${recordId}`, user_id: `eq.${user.id}` });
    const response = await this.#fetch(`${this.#url}/rest/v1/life_records?${parameters}`, {
      method: 'DELETE',
      headers: this.#databaseHeaders('return=representation'),
    });
    assertOk(response, 'Life Record deletion');
    const [record] = await parseJson(response) ?? [];
    if (!record?.id) throw new Error('Life Record not found');
    return { id: record.id, deleted: true };
  }

  async #getUser(accessToken) {
    const response = await this.#fetch(`${this.#url}/auth/v1/user`, {
      headers: { apikey: this.#secretKey, Authorization: `Bearer ${accessToken}` },
    });
    assertOk(response, 'user verification');
    const user = await parseJson(response);
    if (!user?.id) throw new Error('Supabase user verification returned no user');
    return user;
  }

  async #upsertProfile(user) {
    const response = await this.#fetch(`${this.#url}/rest/v1/profiles?on_conflict=id`, {
      method: 'POST',
      headers: this.#databaseHeaders('resolution=merge-duplicates,return=minimal'),
      body: JSON.stringify({ id: user.id, display_name: user.email?.split('@')[0] ?? null }),
    });
    assertOk(response, 'profile upsert');
  }

  async #insertRecord({ userId, text, mood }) {
    const response = await this.#fetch(`${this.#url}/rest/v1/life_records`, {
      method: 'POST',
      headers: this.#databaseHeaders('return=representation'),
      body: JSON.stringify({ user_id: userId, source_type: 'text', raw_text: text, mood, status: 'processed' }),
    });
    assertOk(response, 'Life Record insert');
    const [record] = await parseJson(response) ?? [];
    if (!record?.id) throw new Error('Supabase Life Record insert returned no record');
    return record;
  }

  async #insertAnalysisArtifact({ userId, recordId, analysis }) {
    const response = await this.#fetch(`${this.#url}/rest/v1/record_artifacts`, {
      method: 'POST',
      headers: this.#databaseHeaders('return=minimal'),
      body: JSON.stringify({
        user_id: userId,
        record_id: recordId,
        agent_name: 'diary_analysis',
        schema_version: '1.0',
        model_version: 'external-provider',
        result: analysis,
        confidence: 0.8,
      }),
    });
    assertOk(response, 'analysis artifact insert');
  }

  #databaseHeaders(prefer) {
    return {
      apikey: this.#secretKey,
      Authorization: `Bearer ${this.#secretKey}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    };
  }
}

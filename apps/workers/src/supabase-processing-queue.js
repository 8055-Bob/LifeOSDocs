function assertOk(response, operation) {
  if (response.ok) return;
  throw new Error(`Supabase ${operation} failed (status ${response.status})`);
}

async function parseJson(response) {
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function normalizeJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    recordId: row.record_id,
    userId: row.user_id,
    status: row.status,
    attemptCount: row.attempt_count,
    errorCode: row.last_error_code ?? null,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export class SupabaseProcessingQueue {
  #url;
  #secretKey;
  #fetch;

  constructor({ url, secretKey, fetchImpl = fetch }) {
    if (!url?.trim() || !secretKey?.trim()) {
      throw new Error('Supabase queue requires url and secretKey');
    }
    this.#url = url.replace(/\/$/, '');
    this.#secretKey = secretKey;
    this.#fetch = fetchImpl;
  }

  async enqueue({ recordId, userId }) {
    if (!recordId?.trim() || !userId?.trim()) {
      throw new Error('recordId and userId are required');
    }
    const response = await this.#fetch(`${this.#url}/rest/v1/processing_jobs?on_conflict=record_id`, {
      method: 'POST',
      headers: this.#headers('resolution=ignore-duplicates,return=representation'),
      body: JSON.stringify({ record_id: recordId, user_id: userId, status: 'queued' }),
    });
    assertOk(response, 'processing job enqueue');
    const [job] = await parseJson(response) ?? [];
    return normalizeJob(job) ?? this.get({ recordId });
  }

  async claimNext() {
    const response = await this.#fetch(`${this.#url}/rest/v1/rpc/claim_processing_job`, {
      method: 'POST',
      headers: this.#headers('return=representation'),
      body: '{}',
    });
    assertOk(response, 'processing job claim');
    const [job] = await parseJson(response) ?? [];
    return normalizeJob(job);
  }

  async complete({ recordId }) {
    return this.#update({ recordId, requiredStatus: 'processing', update: { status: 'processed' }, operation: 'processing job completion' });
  }

  async fail({ recordId, errorCode }) {
    if (!errorCode?.trim()) throw new Error('errorCode is required');
    return this.#update({
      recordId,
      requiredStatus: 'processing',
      update: { status: 'failed', last_error_code: errorCode },
      operation: 'processing job failure',
    });
  }

  async get({ recordId }) {
    if (!recordId?.trim()) throw new Error('recordId is required');
    const response = await this.#fetch(`${this.#url}/rest/v1/processing_jobs?record_id=eq.${encodeURIComponent(recordId)}&limit=1`, {
      headers: this.#headers('return=representation'),
    });
    assertOk(response, 'processing job lookup');
    const [job] = await parseJson(response) ?? [];
    return normalizeJob(job);
  }

  async #update({ recordId, requiredStatus, update, operation }) {
    if (!recordId?.trim()) throw new Error('recordId is required');
    const response = await this.#fetch(`${this.#url}/rest/v1/processing_jobs?record_id=eq.${encodeURIComponent(recordId)}&status=eq.${requiredStatus}`, {
      method: 'PATCH',
      headers: this.#headers('return=representation'),
      body: JSON.stringify(update),
    });
    assertOk(response, operation);
    const [job] = await parseJson(response) ?? [];
    if (!job) throw new Error('Processing job not found in the required status');
    return normalizeJob(job);
  }

  #headers(prefer) {
    return {
      apikey: this.#secretKey,
      Authorization: `Bearer ${this.#secretKey}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    };
  }
}

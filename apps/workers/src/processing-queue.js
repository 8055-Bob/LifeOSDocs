export class ProcessingQueue {
  #jobsByRecordId = new Map();

  enqueue({ recordId }) {
    if (!recordId?.trim()) {
      throw new Error('recordId is required');
    }

    if (!this.#jobsByRecordId.has(recordId)) {
      this.#jobsByRecordId.set(recordId, { recordId, status: 'queued' });
    }

    return this.#jobsByRecordId.get(recordId);
  }

  claimNext() {
    const job = [...this.#jobsByRecordId.values()].find(({ status }) => status === 'queued');

    if (!job) {
      return null;
    }

    return this.claim({ recordId: job.recordId });
  }

  claim({ recordId }) {
    const job = this.#jobsByRecordId.get(recordId);
    if (!job || job.status !== 'queued') {
      throw new Error('Queued job not found');
    }

    job.status = 'processing';
    return { ...job };
  }

  complete({ recordId }) {
    const job = this.#jobsByRecordId.get(recordId);
    if (!job || job.status !== 'processing') {
      throw new Error('Processing job not found');
    }

    job.status = 'processed';
    return { ...job };
  }

  get(recordId) {
    const job = this.#jobsByRecordId.get(recordId);
    return job ? { ...job } : null;
  }

  size() {
    return this.#jobsByRecordId.size;
  }
}

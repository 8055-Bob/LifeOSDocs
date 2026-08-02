export class LifeRecordService {
  #records = new Map();

  add(record) {
    this.#records.set(record.id, { ...record });
    return { ...record };
  }

  delete({ recordId, userId }) {
    const record = this.#records.get(recordId);

    if (!record || record.userId !== userId || record.status === 'deleted') {
      throw new Error('Life Record not found');
    }

    record.status = 'deleted';
    record.rawText = null;
    record.transcript = null;
    record.deletedAt = new Date().toISOString();
    return { ...record };
  }
}

import { randomUUID } from 'node:crypto';
import { createKnowledgeAssertion } from '@lifeos/contracts';

export class KnowledgeCore {
  #assertions = [];
  #auditEvents = [];

  apply(proposal) {
    if (proposal.status !== 'proposed') {
      throw new Error('Only proposed memory updates can be applied');
    }

    if (proposal.operation !== 'add') {
      throw new Error('Only add proposals are supported');
    }

    const assertion = createKnowledgeAssertion({
      id: `assertion_${randomUUID()}`,
      type: proposal.type,
      value: proposal.value,
      confidence: proposal.confidence,
      evidenceRecordIds: [proposal.recordId],
    });

    this.#assertions.push(assertion);
    this.#recordAudit({ assertionId: assertion.id, action: 'created', recordId: proposal.recordId });
    return assertion;
  }

  get(assertionId) {
    return this.#assertions.find(({ id }) => id === assertionId) ?? null;
  }

  correct({ assertionId, value, recordId }) {
    const previous = this.get(assertionId);

    if (!previous) {
      throw new Error('Assertion not found');
    }

    previous.status = 'superseded';
    this.#recordAudit({ assertionId: previous.id, action: 'superseded', recordId });
    const corrected = createKnowledgeAssertion({
      id: `assertion_${randomUUID()}`,
      type: previous.type,
      value,
      confidence: 1,
      evidenceRecordIds: [recordId],
    });
    this.#assertions.push(corrected);
    this.#recordAudit({ assertionId: corrected.id, action: 'created', recordId });
    return corrected;
  }

  list({ includeSuperseded = false } = {}) {
    return includeSuperseded
      ? [...this.#assertions]
      : this.#assertions.filter(({ status }) => status === 'active');
  }

  find({ type, search = '' } = {}) {
    const normalizedSearch = search.trim().toLowerCase();
    return this.list().filter((assertion) => (
      (!type || assertion.type === type)
      && (!normalizedSearch || assertion.value.toLowerCase().includes(normalizedSearch))
    ));
  }

  retract({ assertionId, recordId, reason }) {
    const assertion = this.get(assertionId);
    if (!assertion || assertion.status !== 'active') {
      throw new Error('Active assertion not found');
    }

    assertion.status = 'retracted';
    assertion.retractedAt = new Date().toISOString();
    this.#recordAudit({ assertionId, action: 'retracted', recordId, reason });
    return assertion;
  }

  audit(assertionId) {
    return this.#auditEvents.filter((event) => event.assertionId === assertionId).map((event) => ({ ...event }));
  }

  retractEvidenceForRecord(recordId) {
    for (const assertion of this.list()) {
      if (!assertion.evidenceRecordIds.includes(recordId)) continue;
      assertion.evidenceRecordIds = assertion.evidenceRecordIds.filter((id) => id !== recordId);
      if (assertion.evidenceRecordIds.length === 0) {
        assertion.status = 'retracted';
        assertion.retractedAt = new Date().toISOString();
        this.#recordAudit({ assertionId: assertion.id, action: 'retracted_due_to_record_deletion', recordId });
      } else {
        this.#recordAudit({ assertionId: assertion.id, action: 'evidence_removed', recordId });
      }
    }
  }

  #recordAudit({ assertionId, action, recordId, reason = null }) {
    this.#auditEvents.push({ assertionId, action, recordId, reason, at: new Date().toISOString() });
  }
}

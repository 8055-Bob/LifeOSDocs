function validateConfidence(confidence) {
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    throw new Error('confidence must be a number between 0 and 1');
  }
}

export function createKnowledgeAssertion({ id, type, value, confidence, evidenceRecordIds }) {
  validateConfidence(confidence);

  if (!id?.trim() || !type?.trim() || !value?.trim() || evidenceRecordIds.length === 0) {
    throw new Error('id, type, value, and evidenceRecordIds are required');
  }

  return {
    id,
    type,
    value,
    confidence,
    evidenceRecordIds: [...evidenceRecordIds],
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

export function createMemoryProposal({ recordId, operation, type, value, confidence }) {
  validateConfidence(confidence);

  if (!recordId?.trim() || !['add', 'supersede', 'retract'].includes(operation) || !type?.trim() || !value?.trim()) {
    throw new Error('recordId, operation, type, and value are required');
  }

  return {
    recordId,
    operation,
    type,
    value,
    confidence,
    status: 'proposed',
    createdAt: new Date().toISOString(),
  };
}

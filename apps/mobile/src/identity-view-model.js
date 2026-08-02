export function createIdentityViewModel({ assertions }) {
  const sectionsByType = new Map();

  for (const assertion of assertions.filter((item) => item.status === 'active')) {
    const items = sectionsByType.get(assertion.type) ?? [];
    items.push({
      id: assertion.id,
      value: assertion.value,
      confidence: assertion.confidence,
      evidenceRecordIds: [...assertion.evidenceRecordIds],
      canCorrect: true,
    });
    sectionsByType.set(assertion.type, items);
  }

  return {
    sections: [...sectionsByType.entries()].map(([type, items]) => ({ type, items })),
  };
}

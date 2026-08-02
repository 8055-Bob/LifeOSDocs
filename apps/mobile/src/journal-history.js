const MAX_HISTORY_RECORDS = 100;

export function prependJournalRecord(records, record) {
  return [record, ...records].slice(0, MAX_HISTORY_RECORDS);
}

export function createJournalHistoryViewModel(records) {
  return records.map((record) => ({
    id: record.id,
    dateLabel: formatDate(record.createdAt),
    mood: record.mood,
    preview: record.text,
    summary: record.analysis?.summary ?? null,
  }));
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}

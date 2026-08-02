const SENSITIVE_DETAIL_KEYS = new Set(['rawText', 'transcript']);

export function createRequestLog({ requestId, event, details }) {
  const safeDetails = Object.fromEntries(
    Object.entries(details).filter(([key]) => !SENSITIVE_DETAIL_KEYS.has(key)),
  );

  return {
    requestId: requestId ?? `req_${crypto.randomUUID()}`,
    event,
    details: safeDetails,
  };
}

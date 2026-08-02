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

export function createSafeConsoleTelemetry({ write = console.info } = {}) {
  if (typeof write !== 'function') throw new Error('telemetry write function is required');
  return {
    record({ event, details = {} }) {
      write(JSON.stringify(createRequestLog({ event, details })));
    },
  };
}

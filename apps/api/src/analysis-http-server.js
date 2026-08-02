import { createServer } from 'node:http';

const MAX_DIARY_TEXT_LENGTH = 10_000;
const MAX_REQUEST_BODY_BYTES = 50_000;

class InputError extends Error {}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_REQUEST_BODY_BYTES) {
      throw new InputError('Request body is too large');
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new InputError('Invalid request body');
  }
}

function validateDiaryInput(body) {
  const { text, mood = null } = body ?? {};
  if (typeof text !== 'string' || text.trim().length === 0 || text.length > MAX_DIARY_TEXT_LENGTH) {
    throw new InputError(`Text must be between 1 and ${MAX_DIARY_TEXT_LENGTH} characters`);
  }
  if (mood !== null && (!Number.isInteger(mood) || mood < 1 || mood > 5)) {
    throw new InputError('Mood must be an integer between 1 and 5');
  }
  return { text: text.trim(), mood };
}

function readBearerToken(request) {
  const authorization = request.headers.authorization;
  return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : null;
}

export function createAnalysisHttpServer({ provider, recordStore = null }) {
  return createServer(async (request, response) => {
    if (request.method === 'OPTIONS') return sendJson(response, 204, {});

    if (request.method === 'GET' && request.url === '/v1/diary/records') {
      try {
        const accessToken = readBearerToken(request);
        if (!recordStore || !accessToken) return sendJson(response, 401, { error: 'Authentication is required' });
        const records = await recordStore.listJournalRecords({ accessToken });
        return sendJson(response, 200, { records });
      } catch (error) {
        console.error(`LifeOS history failed: ${error.message}`);
        return sendJson(response, 400, { error: error.message });
      }
    }

    const deleteMatch = request.method === 'DELETE' && request.url?.match(/^\/v1\/diary\/records\/([^/]+)$/);
    if (deleteMatch) {
      try {
        const accessToken = readBearerToken(request);
        if (!recordStore || !accessToken) return sendJson(response, 401, { error: 'Authentication is required' });
        const deleted = await recordStore.deleteJournalRecord({ accessToken, recordId: decodeURIComponent(deleteMatch[1]) });
        return sendJson(response, 200, deleted);
      } catch (error) {
        console.error(`LifeOS record deletion failed: ${error.message}`);
        return sendJson(response, 400, { error: error.message });
      }
    }

    if (request.method !== 'POST' || request.url !== '/v1/diary/analyze') return sendJson(response, 404, { error: 'Not found' });

    try {
      const { text, mood } = validateDiaryInput(await readJson(request));
      const analysis = await provider.analyze({ text });
      const accessToken = readBearerToken(request);

      if (!recordStore || !accessToken) {
        return sendJson(response, 200, analysis);
      }

      const record = await recordStore.saveAnalyzedRecord({ accessToken, text, mood, analysis });
      return sendJson(response, 200, { ...analysis, recordId: record.id });
    } catch (error) {
      if (error instanceof InputError) return sendJson(response, 400, { error: error.message });
      console.error(`LifeOS analysis failed: ${error.message}`);
      return sendJson(response, 400, { error: error.message });
    }
  });
}

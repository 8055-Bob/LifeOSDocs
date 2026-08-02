import { createServer } from 'node:http';

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return JSON.parse(body);
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
      const { text, mood = null } = await readJson(request);
      const analysis = await provider.analyze({ text });
      const accessToken = readBearerToken(request);

      if (!recordStore || !accessToken) {
        return sendJson(response, 200, analysis);
      }

      const record = await recordStore.saveAnalyzedRecord({ accessToken, text, mood, analysis });
      return sendJson(response, 200, { ...analysis, recordId: record.id });
    } catch (error) {
      console.error(`LifeOS analysis failed: ${error.message}`);
      return sendJson(response, 400, { error: error.message });
    }
  });
}

import { createAnalysisHttpServer } from './analysis-http-server.js';
import { OpenAIAnalysisProvider } from './openai-analysis-provider.js';
import { GeminiAnalysisProvider } from './gemini-analysis-provider.js';
import { OpenRouterAnalysisProvider } from './openrouter-analysis-provider.js';
import { getSupabaseServerConfig } from './supabase-config.js';
import { SupabaseRecordStore } from './supabase-record-store.js';
import { createSafeConsoleTelemetry } from './observability.js';
import { GroqTranscriptionProvider } from './groq-transcription-provider.js';

const provider = process.env.AI_PROVIDER === 'openrouter'
  ? new OpenRouterAnalysisProvider({ apiKey: process.env.OPENROUTER_API_KEY })
  : process.env.AI_PROVIDER === 'gemini'
    ? new GeminiAnalysisProvider({ apiKey: process.env.GEMINI_API_KEY })
    : new OpenAIAnalysisProvider({ apiKey: process.env.OPENAI_API_KEY });
const recordStore = process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
  ? new SupabaseRecordStore(getSupabaseServerConfig())
  : null;
const telemetry = createSafeConsoleTelemetry();
const transcriber = process.env.GROQ_API_KEY ? new GroqTranscriptionProvider({ apiKey: process.env.GROQ_API_KEY }) : null;
const server = createAnalysisHttpServer({ provider, recordStore, telemetry, transcriber });
const port = Number(process.env.PORT ?? 8787);

server.listen(port, '0.0.0.0', () => {
  console.log(`LifeOS API listening on http://0.0.0.0:${port}`);
});

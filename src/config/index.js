require('dotenv').config();

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseTemperature(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function requiredString(value, variableName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${variableName} must be set in the environment.`);
  }

  return value.trim();
}

// This is what keeps the assistant on topic. A guardrail can only block a list
// of named topics, so it cannot say "answer stock questions only" — that has to
// be described here instead.
const DEFAULT_SYSTEM_PROMPT = [
  'You are a market assistant. You only help with stock markets and company finance:',
  'share prices, indices, commodities, currency rates, and what companies have',
  'reported in their published documents.',
  '',
  'If the user asks about anything else, do not answer it. Reply in one short',
  'sentence that you can only help with market questions, and give one example',
  'of something you can answer. Do not apologise more than once.',
  '',
  'Never tell the user what to buy, sell or hold, and never predict a future',
  'price. You may explain what the numbers are, not what the user should do.',
  '',
  'Use your tools for anything factual. Live prices come from get_price, and',
  'company documents come from search_documents. Do not guess a price from memory.',
].join('\n');

const config = {
  port: process.env.PORT || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  awsRegion: process.env.AWS_REGION || 'ap-south-1',
  bedrockModelId: requiredString(process.env.BEDROCK_MODEL_ID, 'BEDROCK_MODEL_ID'),
  bedrockMaxTokens: parsePositiveInteger(process.env.BEDROCK_MAX_TOKENS, 512),
  bedrockTemperature: parseTemperature(process.env.BEDROCK_TEMPERATURE, 0.7),
  bedrockRequestTimeoutMs: parsePositiveInteger(process.env.BEDROCK_REQUEST_TIMEOUT_MS, 25000),
  maxHistoryMessages: parsePositiveInteger(process.env.MAX_HISTORY_MESSAGES, 20),
  // Leave KNOWLEDGE_BASE_ID empty to run without document search.
  knowledgeBaseId: (process.env.KNOWLEDGE_BASE_ID || '').trim(),
  ragTopK: parsePositiveInteger(process.env.RAG_TOP_K, 4),
  // Leave GUARDRAIL_ID empty to run without a guardrail.
  guardrailId: (process.env.GUARDRAIL_ID || '').trim(),
  guardrailVersion: (process.env.GUARDRAIL_VERSION || '').trim(),
  conversationTtlMs: parsePositiveInteger(process.env.CONVERSATION_TTL_MS, 30 * 60 * 1000),
  // Read from SYSTEM_PROMPT so we can change how the assistant behaves
  // without touching the code. The text below is used when it is not set.
  systemPrompt: (process.env.SYSTEM_PROMPT || '').trim() || DEFAULT_SYSTEM_PROMPT,
};

module.exports = config;

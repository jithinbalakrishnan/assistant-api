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

const config = {
  port: process.env.PORT || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  awsRegion: process.env.AWS_REGION || 'ap-south-1',
  bedrockModelId: requiredString(process.env.BEDROCK_MODEL_ID, 'BEDROCK_MODEL_ID'),
  bedrockMaxTokens: parsePositiveInteger(process.env.BEDROCK_MAX_TOKENS, 512),
  bedrockTemperature: parseTemperature(process.env.BEDROCK_TEMPERATURE, 0.7),
  bedrockRequestTimeoutMs: parsePositiveInteger(process.env.BEDROCK_REQUEST_TIMEOUT_MS, 25000),
  systemPrompt: 'You are a helpful assistant.',
};

module.exports = config;

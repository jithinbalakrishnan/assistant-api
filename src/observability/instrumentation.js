// instrumentation.js
// This sets up the tracing so we can see our chat requests in Langfuse.
//
// This file has to load before everything else (look at server.js).
// If it loads later, some of the tracing does not work.

require('dotenv').config();

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { LangfuseSpanProcessor } = require('@langfuse/otel');

// Tracing is optional. If the keys are missing we just skip it and the
// app works the same as before. The tracing code in chatService still
// runs, but nothing gets sent anywhere.
const isConfigured =
  Boolean(process.env.LANGFUSE_PUBLIC_KEY) && Boolean(process.env.LANGFUSE_SECRET_KEY);

let spanProcessor = null;

if (isConfigured) {
  // This picks up LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY and
  // LANGFUSE_BASE_URL from the .env file on its own.
  spanProcessor = new LangfuseSpanProcessor();

  const sdk = new NodeSDK({ spanProcessors: [spanProcessor] });
  sdk.start();

  console.log('Langfuse tracing enabled');
} else {
  console.log('Langfuse tracing disabled (no LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY)');
}

// Traces are not sent one by one. They are collected and sent together in
// the background. So if we stop the server too fast, the last ones are lost.
// server.js calls this before stopping to send whatever is still waiting.
async function flush() {
  if (spanProcessor) {
    await spanProcessor.forceFlush();
  }
}

module.exports = {
  isConfigured,
  flush,
};

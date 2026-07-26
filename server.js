// Keep this as the first line. The tracing must start before Express and
// the AWS SDK are loaded below, otherwise it cannot track them properly.
const instrumentation = require('./src/observability/instrumentation');

const app = require('./src/app');
const config = require('./src/config');

const server = app.listen(config.port, () => {
  console.log(`assistant-api listening on http://localhost:${config.port}`);
});

// When we press Ctrl+C the app would normally close straight away and the
// last traces would never reach Langfuse. So instead we stop taking new
// requests, send the pending traces, and only then close.
async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down`);

  server.close();
  await instrumentation.flush();

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

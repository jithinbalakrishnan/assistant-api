const config = require('../config');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(config.nodeEnv === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
    },
  });
}

module.exports = errorHandler;

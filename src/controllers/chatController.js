const ApiError = require('../utils/ApiError');
const config = require('../config');
const chatService = require('../services/chatService');

async function postChat(req, res, next) {
  const { name, message, sessionId } = req.body;

  try {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new ApiError(400, '"name" is required and must be a non-empty string.');
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new ApiError(400, '"message" is required and must be a non-empty string.');
    }

    // The sessionId tells us which conversation this message belongs to.
    // We cannot use the name for this, because the same person can open two
    // browser tabs and those two chats should not mix together.
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new ApiError(400, '"sessionId" is required and must be a non-empty string.');
    }
  } catch (err) {
    next(err);
    return;
  }

  // This controller represents the Bedrock work for this one HTTP request.
  // It is aborted if the browser cancels the request or the server timeout is reached.
  const abortController = new AbortController();
  let timedOut = false;

  const abortRequest = () => {
    abortController.abort();
  };

  const timeout = setTimeout(() => {
    timedOut = true;
    abortRequest();
  }, config.bedrockRequestTimeoutMs);

  req.once('aborted', abortRequest);
  res.once('close', abortRequest);

  try {
    const result = await chatService.generateReply(
      name.trim(),
      message.trim(),
      sessionId.trim(),
      abortController.signal,
    );

    if (!abortController.signal.aborted) {
      res.status(200).json(result);
    }
  } catch (err) {
    if (abortController.signal.aborted) {
      if (timedOut && !res.headersSent) {
        next(new ApiError(504, 'The AI assistant took too long to respond. Please try again.'));
      }
      return;
    }

    next(err);
  } finally {
    clearTimeout(timeout);
    req.off('aborted', abortRequest);
    res.off('close', abortRequest);
  }
}

module.exports = {
  postChat,
};

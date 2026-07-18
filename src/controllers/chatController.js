const ApiError = require('../utils/ApiError');
const chatService = require('../services/chatService');

function postChat(req, res, next) {
  try {
    const { name, message } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new ApiError(400, '"name" is required and must be a non-empty string.');
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new ApiError(400, '"message" is required and must be a non-empty string.');
    }

    const result = chatService.generateReply(name.trim(), message.trim());

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  postChat,
};

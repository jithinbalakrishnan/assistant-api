// conversationService.js
// Remembers what was said in each conversation, so the model can answer
// follow-up questions like "what is the price of my favourite stock?".
//
// Everything is kept in memory, which means it is lost when the server
// restarts. That is fine for now. If we ever want it to survive restarts,
// only this file has to change (for example to use Redis).

const config = require('../config');

// One entry per conversation: sessionId -> { messages, lastUsedAt }
const conversations = new Map();

// Removes old messages so the conversation does not grow forever.
// Every message is sent to the model again on the next request, so a long
// history costs more tokens every time.
//
// We cannot just cut the last N messages though. When the model uses a tool
// it creates a pair: a "toolUse" message and a "toolResult" message.
// Bedrock rejects the request if a toolUse has no matching toolResult, so we
// only cut at the start of a normal user message, which is always a safe spot.
function trim(messages) {
  if (messages.length <= config.maxHistoryMessages) {
    return messages;
  }

  const startFrom = messages.length - config.maxHistoryMessages;

  for (let i = startFrom; i < messages.length; i += 1) {
    const msg = messages[i];
    const isPlainUserMessage =
      msg.role === 'user' && msg.content.every((block) => block.text !== undefined);

    if (isPlainUserMessage) {
      return messages.slice(i);
    }
  }

  // No safe place to cut, so keep everything this time and try again later.
  return messages;
}

// Throws away conversations nobody has used for a while.
// Without this the Map would keep growing and slowly eat memory.
function removeOldConversations() {
  const now = Date.now();

  for (const [sessionId, conversation] of conversations) {
    if (now - conversation.lastUsedAt > config.conversationTtlMs) {
      conversations.delete(sessionId);
    }
  }
}

// Gives back the messages of this conversation, or an empty list if it is new.
function getMessages(sessionId) {
  removeOldConversations();

  const conversation = conversations.get(sessionId);
  return conversation ? conversation.messages : [];
}

// Saves the conversation after a chat request is finished.
function saveMessages(sessionId, messages) {
  conversations.set(sessionId, {
    messages: trim(messages),
    lastUsedAt: Date.now(),
  });
}

module.exports = {
  getMessages,
  saveMessages,
};

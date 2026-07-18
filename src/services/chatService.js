/**
 * Generates an assistant reply for a given user and message.
 * Hardcoded for now; this is the seam where an LLM provider
 * (OpenAI, Anthropic, Gemini, Ollama, etc.) will plug in later.
 */
function generateReply(name, message) {
  const reply = `Hello ${name}! Nice to meet you. How can I assist you today?`;
  return { reply };
}

module.exports = {
  generateReply,
};

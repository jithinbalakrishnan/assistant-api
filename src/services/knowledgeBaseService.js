// knowledgeBaseService.js
// Searches our documents (like the SBI annual report) using the
// Bedrock Knowledge Base we created in the AWS console.
//
// This is the RAG part of the app. RAG means we look up pieces of our own
// documents first, and then let the model answer using those pieces.
// Without it the model can only use what it learned during training,
// and it knows nothing about the reports we uploaded.
//
// AWS already did the hard work when we clicked "Sync": it read the PDF,
// cut it into chunks and turned every chunk into numbers (embeddings).
// Here we only ask it "which chunks look like this question?".

const { BedrockAgentRuntimeClient, RetrieveCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const config = require('../config');

// Note this is a different client than the one in chatService.
// That one talks to the model, this one talks to the Knowledge Base.
const client = new BedrockAgentRuntimeClient({ region: config.awsRegion });

// True only when KNOWLEDGE_BASE_ID is filled in, so the app still runs
// for anyone who has not created a Knowledge Base yet.
const isConfigured = Boolean(config.knowledgeBaseId);

async function searchDocuments(query, abortSignal) {
  const command = new RetrieveCommand({
    knowledgeBaseId: config.knowledgeBaseId,
    retrievalQuery: { text: query },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        // How many chunks to bring back. More chunks means a better chance
        // of finding the answer, but also more tokens sent to the model.
        numberOfResults: config.ragTopK,
      },
    },
  });

  const response = await client.send(command, { abortSignal });
  const results = response.retrievalResults || [];

  // We only keep what the model actually needs. The raw AWS response has a
  // lot of extra fields, and everything we return is sent to the model as
  // tokens, so smaller is cheaper.
  return {
    query,
    matches: results.map((result) => ({
      text: result.content?.text || '',
      // How close this chunk is to the question. Higher is better.
      score: result.score,
      // Which file the text came from, so the model can mention the source.
      source: result.location?.s3Location?.uri || 'unknown',
    })),
  };
}

module.exports = {
  isConfigured,
  searchDocuments,
};

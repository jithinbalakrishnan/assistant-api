const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const config = require('../config');

const client = new BedrockRuntimeClient({ region: config.awsRegion });

async function generateReply(name, message, abortSignal) {
  const command = new ConverseCommand({
    modelId: config.bedrockModelId,
    system: [{ text: config.systemPrompt }],
    messages: [
      {
        role: 'user',
        content: [{ text: message }],
      },
    ],
    inferenceConfig: {
      maxTokens: config.bedrockMaxTokens,
      temperature: config.bedrockTemperature,
    },
  });

  const response = await client.send(command, { abortSignal });
  console.log(JSON.stringify(response, null, 2));
  
  const reply = response.output.message.content[0].text;

  return { reply };
}

module.exports = {
  generateReply,
};

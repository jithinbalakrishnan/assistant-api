// function generateReply(name, message) {
//   const reply = `Hello ${name}! Nice to meet you. How can I assist you today?`;
//   return { reply };
// }

// module.exports = {
//   generateReply,
// };

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

async function generateReply(name, message) {
  const command = new ConverseCommand({
    modelId: 'arn:aws:bedrock:ap-south-1:567355540277:inference-profile/apac.amazon.nova-micro-v1:0',
    system: [{ text: `You are a helpful assistant. The user's name is ${name}.` }],
    messages: [
      {
        role: 'user',
        content: [{ text: message }],
      },
    ],
    inferenceConfig: {
      maxTokens: 512,
      temperature: 0.7,
    },
  });

  const response = await client.send(command);
  console.log(JSON.stringify(response, null, 2));
  
  const reply = response.output.message.content[0].text;

  return { reply };
}

module.exports = {
  generateReply,
};

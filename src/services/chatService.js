const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { startObservation, propagateAttributes } = require('@langfuse/tracing');
const crypto = require('node:crypto');
const config = require('../config');
const priceService = require('./priceService');

const client = new BedrockRuntimeClient({ region: config.awsRegion });

// ---------------------------------------------------------------------------
// Tool definitions — the "menu" of functions the model is allowed to ask for.
// The model never runs these itself. It sends back a structured request
// ("please call get_price with symbol=RELIANCE.NS") and OUR code runs it.
// The description is important: it is how the model learns when to use the tool
// and which symbol format to use.
// ---------------------------------------------------------------------------
const toolConfig = {
  tools: [ // an array — you can offer several tools
    {
      toolSpec: { // one tool's specification
        name: 'get_price', // the name the model will send back when requesting it
        description: // WHEN to use it (the model reads this to decide)
          'Get the live market price of a stock, commodity future, currency pair, or index ' +
          'from Yahoo Finance. Symbol conventions: Indian NSE stocks end with .NS ' +
          '(RELIANCE.NS, TCS.NS, HDFCBANK.NS). Crude oil futures: CL=F for WTI, BZ=F for Brent. ' +
          'US Dollar to Indian Rupee rate: INR=X. Nifty 50 index: ^NSEI. Sensex: ^BSESN. Gold: GC=F.',
        inputSchema: {
          json: { // JSON Schema — the shape of arguments allowed
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'The Yahoo Finance symbol, e.g. RELIANCE.NS or CL=F',
              },
            },
            required: ['symbol'],
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'search_symbol',
        description: // fallback only — call this when get_price failed or the symbol is unknown
          'Find the Yahoo Finance symbol for a company name. Do NOT use this for well-known ' +
          'symbols listed in the get_price description — call get_price directly for those. ' +
          'Use this only for companies whose symbol you do not know, or after a get_price ' +
          'call returned an error. Returns several matches across exchanges; pick the one ' +
          'matching the exchange the user means (prefer .NS for Indian companies).',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The company name to search for, e.g. Tata Motors',
              },
            },
            required: ['query'],
          },
        },
      },
    },
  ],
};

// Runs the tool the model asked for. When we add more tools later
// (search_symbol, get_history, ...), they get dispatched from here.
async function runTool(toolName, input) {
  if (toolName === 'get_price') {
    return priceService.getPrice(input.symbol);
  }

  if (toolName === 'search_symbol') {
    return priceService.searchSymbol(input.query);
  }

  // The model asked for a tool we don't have — answer with an error instead of crashing.
  return { error: `Unknown tool: ${toolName}` };
}

// Some models plan out loud in <thinking> tags when tools are enabled.
// That is meant for the model, not the user — strip it from the final reply.
function stripThinking(text) {
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
}

// Safety cap: a confused model could keep asking for tools forever,
// and every loop iteration is a billed Bedrock call.
const MAX_ITERATIONS = 5;

// This is the same loop as before, but now it also sends what happens to
// Langfuse so we can see it on the dashboard. Langfuse has three levels and
// they match our loop nicely:
//   trace      = one /chat request
//   generation = one model call (one iteration)
//   tool       = one tool call like get_price
// If the Langfuse keys are missing these lines simply do nothing.
async function runLoop(requestId, message, abortSignal, trace) {
  // The conversation the model sees. It grows on every loop iteration.
  const messages = [
    {
      role: 'user',
      content: [{ text: message }],
    },
  ];

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration += 1) {
    console.log(`[${requestId}] iteration ${iteration} -> calling model`);

    const command = new ConverseCommand({
      modelId: config.bedrockModelId,
      system: [{ text: config.systemPrompt }],
      messages,
      toolConfig,
      inferenceConfig: {
        maxTokens: config.bedrockMaxTokens,
        temperature: config.bedrockTemperature,
      },
    });

    // In Langfuse a model call is called a "generation".
    // We send the token counts too, because that is what Langfuse uses
    // to work out how much the request cost.
    const generation = trace.startObservation(
      `model-call-${iteration}`,
      {
        model: config.bedrockModelId,
        input: messages,
        modelParameters: {
          maxTokens: config.bedrockMaxTokens,
          temperature: config.bedrockTemperature,
        },
      },
      { asType: 'generation' },
    );

    let response;
    try {
      response = await client.send(command, { abortSignal });
    } catch (err) {
      generation.update({ level: 'ERROR', statusMessage: err.message });
      generation.end();
      throw err;
    }

    generation.update({
      output: response.output.message,
      usageDetails: {
        input: response.usage.inputTokens,
        output: response.usage.outputTokens,
        total: response.usage.totalTokens,
      },
      metadata: { stopReason: response.stopReason },
    });
    generation.end();

    console.log(
      `[${requestId}] iteration ${iteration} <- stopReason: ${response.stopReason} ` +
        `(input ${response.usage.inputTokens} / output ${response.usage.outputTokens} tokens)`,
    );

    // Whatever the model replied becomes part of the conversation history.
    messages.push(response.output.message);

    if (response.stopReason !== 'tool_use') {
      // The model is done — find the text block and return it.
      const textBlock = response.output.message.content.find((block) => block.text);
      console.log(`[${requestId}] done after ${iteration} iteration(s)`);
      return { reply: textBlock ? stripThinking(textBlock.text) : '' };
    }

    // The model asked for one or more tools. Run each one and collect the results.
    const toolResults = [];

    for (const block of response.output.message.content) {
      if (!block.toolUse) continue;

      const { toolUseId, name: toolName, input } = block.toolUse;
      console.log(`[${requestId}] tool requested: ${toolName} ${JSON.stringify(input)}`);

      const toolSpan = trace.startObservation(toolName, { input }, { asType: 'tool' });

      let result;
      try {
        result = await runTool(toolName, input);
        toolSpan.update({ output: result });
      } catch (err) {
        // Tool failures go back to the model as data, so it can apologize or
        // try a different symbol instead of the whole request crashing.
        result = { error: err.message };
        toolSpan.update({ output: result, level: 'ERROR', statusMessage: err.message });
      }
      toolSpan.end();

      console.log(`[${requestId}] tool result: ${JSON.stringify(result)}`);

      toolResults.push({
        toolResult: {
          toolUseId, // ticket number — matches this result to the model's request
          content: [{ json: result }],
        },
      });
    }

    // Tool results are sent back as a "user" message, then the loop repeats
    // and the model reads the conversation again — now with the data it asked for.
    messages.push({ role: 'user', content: toolResults });
  }

  // Only reached if the model kept asking for tools MAX_ITERATIONS times in a row.
  console.log(`[${requestId}] gave up after ${MAX_ITERATIONS} iterations`);
  return { reply: 'Sorry, I could not finish answering that. Please try asking in a simpler way.' };
}

async function generateReply(name, message, abortSignal) {
  // Short id to tag all log lines of this one chat request,
  // so logs from two users chatting at once don't get mixed up.
  const requestId = crypto.randomUUID().slice(0, 8);

  // This puts the user's name on everything we send inside, so on the
  // Langfuse dashboard we can filter by user and see the cost per user.
  return propagateAttributes({ userId: name }, async () => {
    const trace = startObservation('chat', { input: message });

    try {
      const result = await runLoop(requestId, message, abortSignal, trace);
      trace.update({ output: result.reply });
      return result;
    } catch (err) {
      trace.update({ level: 'ERROR', statusMessage: err.message });
      throw err;
    } finally {
      // Always end the trace, even when there is an error or the user
      // cancels. If we forget to end it, it never shows up in Langfuse.
      trace.end();
    }
  });
}

module.exports = {
  generateReply,
};

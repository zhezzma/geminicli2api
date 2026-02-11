import { readBody, HTTPError } from 'h3';
import { convertGeminiToOpenAI, convertGeminiChunkToOpenAI, convertOpenAIToGemini } from '../utils/converter.js';

/**
 * Handle chat completion requests
 * @param {import('h3').H3Event} event - H3 事件对象。
 * @param {import('@google/gemini-cli-core').ContentGenerator} codeAssist - Gemini code assist instance
 * @param {string} account - account
 * @param {string} defaultModel - Default model name
 * @returns {Promise<Response>} - Response object
 */
export async function handleChatCompletion(event, codeAssist, defaultModel) {
  try {
    const body = await readBody(event);
    const params = body || {};

    const model = params.model || defaultModel;
    const isStreaming = params.stream || false;
    
   
    // Convert OpenAI messages to Gemini format
    const { contents, systemInstruction } = convertOpenAIToGemini(params.messages || []);

    const generateContentParameters = {
      model,
      config: {
        temperature: params.temperature || 1,
        thinkingConfig: {
          includeThoughts: true,
        },
        systemInstruction: systemInstruction,
      },
      contents: contents,
    };

    console.log(`Processing request: account=${process.env.GOOGLE_ACCOUNT}, project_id=${process.env.GOOGLE_CLOUD_PROJECT},  model=${model}, streaming=${isStreaming}`);

    if (!isStreaming) {
      // Non-streaming response
      const result = await codeAssist.generateContent(generateContentParameters, "");
      const openaiResponse = convertGeminiToOpenAI(result, model);
      return openaiResponse;
    } else {
      // Streaming response
      const stream = await codeAssist.generateContentStream(generateContentParameters, "");

      // Create SSE stream
      const sseStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              console.log(JSON.stringify(chunk))
              const openaiChunk = convertGeminiChunkToOpenAI(chunk, model);
              
              // // Skip thinking chunks if includeThoughts is false
              // if (!shouldIncludeThoughts && openaiChunk.choices?.[0]?.delta?.type === 'thinking') {
              //   continue;
              // }
              
              const data = `data: ${JSON.stringify(openaiChunk)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Error in SSE stream:', error);
            controller.error(error);
          }
        }
      });

      // Return streaming response
      event.res.headers.set('Content-Type', 'text/event-stream');
      event.res.headers.set('Cache-Control', 'no-cache');
      event.res.headers.set('Connection', 'keep-alive');
      event.res.headers.set('Transfer-Encoding', 'chunked');

      return sseStream;
    }
  } catch (error) {
    const message = `${process.env.GOOGLE_ACCOUNT} - ${process.env.GOOGLE_CLOUD_PROJECT} : ${error.message}`;
    throw new HTTPError(message, {
      statusCode: 400,
      body: { error: message },
    });
  }
}

/**
 * Handle models list request
 * @returns {Object} - OpenAI formatted models list
 */
export function handleModels() {
  return {
    object: "list",
    data: [
      {
        id: "gemini-2.5-pro",
        object: "model",
        created: Date.now(),
        owned_by: "google"
      },
      {
        id: "gemini-2.5-flash",
        object: "model",
        created: Date.now(),
        owned_by: "google"
      },
      {
        id: "gemini-2.5-flash-lite",
        object: "model",
        created: Date.now(),
        owned_by: "google"
      }
    ]
  };
}
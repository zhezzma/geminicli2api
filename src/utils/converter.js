/**
 * Extract media type from base64 data URL
 * @param {string} base64String - Base64 data URL
 * @returns {string|null} - Media type or null
 */
export function getMediaType(base64String) {
  const matches = base64String.match(/^data:(.*?);base64,/);
  if (matches && matches.length > 1) {
    return matches[1];
  }
  return null;
}

/**
 * Convert Gemini response to OpenAI format (non-streaming)
 * @param {Object} geminiResponse - Gemini API response
 * @param {string} model - Model name
 * @returns {Object} - OpenAI formatted response
 */
export function convertGeminiToOpenAI(geminiResponse, model) {
  const candidate = geminiResponse.candidates?.[0];
  const content = candidate?.content;
  const parts = content?.parts || [];
  const modelVersion = geminiResponse.modelVersion || model;

  let textContent = "";
  for (const part of parts) {
    if (part.text) {
      textContent += part.text;
    }
  }

  const finishReason = candidate?.finishReason === "STOP" ? "stop" :
    candidate?.finishReason === "MAX_TOKENS" ? "length" :
      "stop";

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: modelVersion,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textContent,
        },
        finish_reason: finishReason,
      }
    ],
    usage: {
      prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
      completion_tokens: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: geminiResponse.usageMetadata?.totalTokenCount || 0,
    },
  };
}

/**
 * Convert Gemini stream chunk to OpenAI format
 * @param {Object} geminiChunk - Gemini stream chunk
 * @param {string} model - Model name
 * @returns {Object} - OpenAI formatted chunk
 */
export function convertGeminiChunkToOpenAI(geminiChunk, model) {
  const candidate = geminiChunk.candidates?.[0];
  const content = candidate?.content;
  const parts = content?.parts || [];

  let textContent = "";
  let textType = "text";

  for (const part of parts) {
    if (part.text) {
      textContent += part.text;
    }
    if (part.thought) {
      textType = "thinking";
    }
  }

  const finishReason = candidate?.finishReason === "STOP" ? "stop" :
    candidate?.finishReason === "MAX_TOKENS" ? "length" :
      null;

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        delta: {
          role: "assistant",
          type: textType,
          content: textContent,
        },
        finish_reason: finishReason,
      }
    ],
  };
}

/**
 * Convert OpenAI messages to Gemini format
 * @param {Array} messages - OpenAI messages array
 * @returns {Object} - Contains contents and systemInstruction
 */
export function convertOpenAIToGemini(messages) {
  let systemMessageContent = "";
  const messagesCopy = [...messages];

  // Extract system message if present
  if (messagesCopy[0]?.role === "system") {
    systemMessageContent = messagesCopy.shift().content;
  }

  const contents = messagesCopy.map((x) => {
    let role = "";
    if (x.role === "assistant") {
      role = "model";
    }
    if (x.role === "user") {
      role = "user";
    }

    const parts = [];

    if (Array.isArray(x.content)) {
      x.content.forEach((c) => {
        if (c.type === "text") {
          parts.push({ text: c.text });
        }
        if (c.type === "image_url") {
          parts.push({
            inlineData: {
              mimeType: getMediaType(c.image_url.url) || "image/jpeg",
              data: c.image_url.url.split(",")[1] || "",
            }
          });
        }
      });
    } else {
      parts.push({ text: x.content });
    }

    return {
      role: role,
      parts: parts,
    };
  });

  return {
    contents,
    systemInstruction: systemMessageContent ? {
      parts: [{ text: systemMessageContent }]
    } : undefined
  };
}
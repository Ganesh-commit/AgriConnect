/**
 * Google Gemini Provider (Primary Cloud Provider)
 * Supports @google/genai SDK if installed, with built-in official Gemini v1beta REST client.
 * Official endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * Free-tier default model (per ai.google.dev): gemini-2.5-flash
 */

let GoogleGenAI = null;
try {
  const sdk = require('@google/genai');
  GoogleGenAI = sdk.GoogleGenAI || sdk.default;
} catch {
  GoogleGenAI = null;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function getApiKey() {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (
    !key ||
    key === 'your_gemini_api_key_here' ||
    key.startsWith('your_')
  ) {
    return '';
  }
  return key;
}

function getModel() {
  return (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
}

function isConfigured() {
  return Boolean(getApiKey());
}

/**
 * Formats chat messages [{ role: 'user'|'assistant'|'tool'|'system', content, toolCalls, name, result }] into Gemini `contents`.
 */
function buildGeminiContents(messages = []) {
  const contents = [];
  for (const m of messages) {
    if (!m || m.role === 'system') continue;

    if (m.role === 'tool') {
      let responseObj = m.result;
      if (!responseObj && typeof m.content === 'string') {
        try {
          responseObj = JSON.parse(m.content);
        } catch {
          responseObj = { result: m.content };
        }
      }
      contents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: m.name || 'tool',
              response:
                responseObj && typeof responseObj === 'object' && !Array.isArray(responseObj)
                  ? responseObj
                  : { result: responseObj }
            }
          }
        ]
      });
      continue;
    }

    if (m.role === 'assistant' || m.role === 'model') {
      const parts = [];
      if (m.content) {
        parts.push({ text: String(m.content) });
      }
      if (Array.isArray(m.toolCalls) && m.toolCalls.length > 0) {
        for (const tc of m.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.args || {}
            }
          });
        }
      }
      if (parts.length > 0) {
        contents.push({ role: 'model', parts });
      }
      continue;
    }

    if (m.content) {
      contents.push({
        role: 'user',
        parts: [{ text: String(m.content) }]
      });
    }
  }
  return contents;
}

/**
 * Formats tool definitions into Gemini functionDeclarations.
 */
function buildGeminiTools(tools = []) {
  if (!Array.isArray(tools) || tools.length === 0) return null;
  const functionDeclarations = tools.map((t) => {
    const params = t.parameters || { type: 'OBJECT', properties: {} };
    const hasProps = params.properties && Object.keys(params.properties).length > 0;
    return {
      name: t.name,
      description: t.description || '',
      ...(hasProps ? { parameters: params } : {})
    };
  });
  return [{ functionDeclarations }];
}

/**
 * Makes a request to Gemini using @google/genai SDK if available, or official v1beta REST API.
 */
async function callGeminiGenerate({
  contents,
  system,
  tools = null,
  temperature = 0.4,
  maxOutputTokens = 1024,
  responseMimeType = null,
  timeoutMs = 60000
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  const model = getModel();
  const geminiTools = buildGeminiTools(tools);

  // If @google/genai SDK is installed, use it
  if (GoogleGenAI) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const config = {
        temperature,
        maxOutputTokens
      };
      if (system) config.systemInstruction = system;
      if (responseMimeType) config.responseMimeType = responseMimeType;
      if (geminiTools) config.tools = geminiTools;

      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents,
          config
        }),
        new Promise((_, reject) =>
          setTimeout(() => {
            const timeoutErr = new Error(`Gemini request timed out after ${timeoutMs}ms`);
            timeoutErr.status = 408;
            reject(timeoutErr);
          }, timeoutMs)
        )
      ]);

      const parts = response?.candidates?.[0]?.content?.parts || [];
      const toolCalls = parts
        .filter((p) => p && p.functionCall)
        .map((p, idx) => ({
          id: `call_${Date.now()}_${idx}`,
          name: p.functionCall.name,
          args: p.functionCall.args || {}
        }));

      const text =
        typeof response.text === 'string' && toolCalls.length === 0
          ? response.text
          : parts.map((p) => p.text || '').join('') || '';

      return { text, toolCalls, model };
    } catch (sdkErr) {
      if (sdkErr.status || sdkErr.statusCode) {
        sdkErr.status = sdkErr.status || sdkErr.statusCode;
      }
      throw sdkErr;
    }
  }

  // Official Gemini v1beta REST API
  const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(responseMimeType ? { responseMimeType } : {})
    },
    ...(geminiTools ? { tools: geminiTools } : {})
  };

  if (system) {
    body.systemInstruction = {
      parts: [{ text: String(system) }]
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const err = new Error(`Gemini HTTP ${res.status}: ${errBody.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const toolCalls = parts
      .filter((p) => p && p.functionCall)
      .map((p, idx) => ({
        id: `call_${Date.now()}_${idx}`,
        name: p.functionCall.name,
        args: p.functionCall.args || {}
      }));

    const text = parts.map((p) => p.text || '').join('') || '';

    if (!text && toolCalls.length === 0 && data?.promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked prompt: ${data.promptFeedback.blockReason}`);
    }

    return { text, toolCalls, model };
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Gemini request timed out after ${timeoutMs}ms`);
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Standard chat completion (supports optional function calling via `tools`)
 */
async function chat({
  messages = [],
  system = '',
  tools = null,
  temperature = 0.4,
  maxOutputTokens = 1024,
  timeoutMs = 60000
}) {
  const contents = buildGeminiContents(messages);
  if (contents.length === 0) {
    throw new Error('Gemini chat requires at least one user message');
  }
  return callGeminiGenerate({
    contents,
    system,
    tools,
    temperature,
    maxOutputTokens,
    timeoutMs
  });
}

/**
 * Streaming chat completion using official Gemini SSE endpoint (:streamGenerateContent?alt=sse)
 */
async function chatStream({
  messages = [],
  system = '',
  temperature = 0.4,
  maxOutputTokens = 1024,
  timeoutMs = 60000,
  onToken
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  const model = getModel();
  const contents = buildGeminiContents(messages);
  const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

  const body = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens
    }
  };

  if (system) {
    body.systemInstruction = {
      parts: [{ text: String(system) }]
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const err = new Error(`Gemini stream HTTP ${res.status}: ${errBody.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }

    if (!res.body) {
      // Fallback to non-streaming if readable stream unavailable
      const fallback = await chat({ messages, system, temperature, maxOutputTokens, timeoutMs });
      if (onToken && fallback.text) onToken(fallback.text);
      return fallback;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const chunkText =
            parsed?.candidates?.[0]?.content?.parts
              ?.map((p) => p.text || '')
              .join('') || '';
          if (chunkText) {
            fullText += chunkText;
            if (typeof onToken === 'function') {
              onToken(chunkText);
            }
          }
        } catch {
          // Ignore partial SSE chunk parse error
        }
      }
    }

    return { text: fullText, model };
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Gemini stream timed out after ${timeoutMs}ms`);
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Vision analysis (same Gemini model handles text and image input)
 */
async function vision({
  prompt,
  imageBase64,
  mimeType = 'image/jpeg',
  system = '',
  temperature = 0.2,
  maxOutputTokens = 1024,
  responseMimeType = null,
  timeoutMs = 60000
}) {
  if (!imageBase64) {
    throw new Error('imageBase64 is required for vision call');
  }
  const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

  const contents = [
    {
      role: 'user',
      parts: [
        { text: String(prompt || 'Analyze this agricultural image.') },
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: cleanBase64
          }
        }
      ]
    }
  ];

  return callGeminiGenerate({
    contents,
    system,
    temperature,
    maxOutputTokens,
    responseMimeType,
    timeoutMs
  });
}

/**
 * Structured JSON generation (forces responseMimeType: 'application/json')
 */
async function json({
  prompt,
  system = '',
  temperature = 0.2,
  maxOutputTokens = 1024,
  imageBase64 = null,
  mimeType = 'image/jpeg',
  timeoutMs = 60000
}) {
  if (imageBase64) {
    return vision({
      prompt,
      imageBase64,
      mimeType,
      system,
      temperature,
      maxOutputTokens,
      responseMimeType: 'application/json',
      timeoutMs
    });
  }

  const contents = [
    {
      role: 'user',
      parts: [{ text: String(prompt) }]
    }
  ];

  return callGeminiGenerate({
    contents,
    system,
    temperature,
    maxOutputTokens,
    responseMimeType: 'application/json',
    timeoutMs
  });
}

/**
 * Health check for /api/ai/health
 */
async function checkHealth() {
  const configured = isConfigured();
  const model = getModel();

  if (!configured) {
    return {
      name: 'gemini',
      configured: false,
      reachable: false,
      model,
      visionModel: model,
      reason: 'GEMINI_API_KEY not set'
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'x-goog-api-key': getApiKey() },
      signal: controller.signal
    });

    return {
      name: 'gemini',
      configured: true,
      reachable: res.ok,
      model,
      visionModel: model,
      ...(res.ok ? {} : { reason: `HTTP ${res.status}` })
    };
  } catch (err) {
    return {
      name: 'gemini',
      configured: true,
      reachable: false,
      model,
      visionModel: model,
      reason: err.message
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  name: 'gemini',
  isCloud: true,
  isConfigured,
  getModel,
  checkHealth,
  chat,
  chatStream,
  vision,
  json
};


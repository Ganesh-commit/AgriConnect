/**
 * Anthropic Provider Stub (Optional, for future paid use)
 * Implements the identical LLM provider interface:
 *   chat, chatStream, vision, json, checkHealth, isConfigured
 * Official endpoint: https://api.anthropic.com/v1/messages
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-haiku-latest';

function getApiKey() {
  const key = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!key || key === 'your_anthropic_api_key_here' || key.startsWith('your_')) {
    return '';
  }
  return key;
}

function getModel() {
  return (process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL).trim();
}

function isConfigured() {
  return Boolean(getApiKey());
}

async function chat({
  messages = [],
  system = '',
  temperature = 0.4,
  maxOutputTokens = 1024,
  timeoutMs = 60000
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('ANTHROPIC_API_KEY is not configured (Anthropic stub skipped)');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  const model = getModel();
  const formattedMessages = messages
    .filter((m) => m && m.role !== 'system' && m.content)
    .map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
      content: String(m.content)
    }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxOutputTokens,
        temperature,
        ...(system ? { system: String(system) } : {}),
        messages: formattedMessages
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const err = new Error(`Anthropic HTTP ${res.status}: ${errBody.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const text =
      data?.content?.map((block) => block.text || '').join('') || '';
    return { text, model };
  } finally {
    clearTimeout(timer);
  }
}

async function chatStream(params) {
  const result = await chat(params);
  if (typeof params.onToken === 'function' && result.text) {
    params.onToken(result.text);
  }
  return result;
}

async function vision({
  prompt,
  imageBase64,
  mimeType = 'image/jpeg',
  system = '',
  temperature = 0.2,
  maxOutputTokens = 1024,
  timeoutMs = 60000
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('ANTHROPIC_API_KEY is not configured (Anthropic stub skipped)');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  const model = getModel();
  const cleanBase64 = (imageBase64 || '').replace(/^data:[^;]+;base64,/, '');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxOutputTokens,
        temperature,
        ...(system ? { system: String(system) } : {}),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType || 'image/jpeg',
                  data: cleanBase64
                }
              },
              {
                type: 'text',
                text: String(prompt || 'Analyze this image.')
              }
            ]
          }
        ]
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const err = new Error(`Anthropic vision HTTP ${res.status}: ${errBody.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const text = data?.content?.map((block) => block.text || '').join('') || '';
    return { text, model };
  } finally {
    clearTimeout(timer);
  }
}

async function json({
  prompt,
  system = '',
  temperature = 0.2,
  maxOutputTokens = 1024,
  imageBase64 = null,
  mimeType = 'image/jpeg',
  timeoutMs = 60000
}) {
  const jsonSystem = `${system ? `${system}\n` : ''}Respond ONLY with valid JSON. Do not wrap in markdown or add commentary.`;
  if (imageBase64) {
    return vision({
      prompt,
      imageBase64,
      mimeType,
      system: jsonSystem,
      temperature,
      maxOutputTokens,
      timeoutMs
    });
  }
  return chat({
    messages: [{ role: 'user', content: String(prompt) }],
    system: jsonSystem,
    temperature,
    maxOutputTokens,
    timeoutMs
  });
}

async function checkHealth() {
  const configured = isConfigured();
  const model = getModel();
  return {
    name: 'anthropic',
    configured,
    reachable: configured,
    model,
    visionModel: model,
    stub: true,
    ...(configured ? {} : { reason: 'ANTHROPIC_API_KEY not set (optional stub)' })
  };
}

module.exports = {
  name: 'anthropic',
  isCloud: true,
  isConfigured,
  getModel,
  checkHealth,
  chat,
  chatStream,
  vision,
  json
};


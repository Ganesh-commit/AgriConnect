/**
 * Ollama Provider (Local Fallback & Privacy Mode Provider)
 * Uses native Ollama /api/chat endpoint.
 * Default env:
 *   OLLAMA_BASE_URL=http://localhost:11434
 *   OLLAMA_CHAT_MODEL=llama3.1:8b
 *   OLLAMA_VISION_MODEL=llama3.2-vision
 */

function getBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').trim().replace(/\/+$/, '');
}

function getChatModel() {
  return (process.env.OLLAMA_CHAT_MODEL || 'llama3.1:8b').trim();
}

function getVisionModel() {
  return (process.env.OLLAMA_VISION_MODEL || 'llama3.2-vision').trim();
}

function isConfigured() {
  // Ollama is considered configured unless explicitly disabled via OLLAMA_ENABLED=false
  if (String(process.env.OLLAMA_ENABLED || '').toLowerCase() === 'false') {
    return false;
  }
  return Boolean(getBaseUrl());
}

function toLowerCaseSchemaTypes(schema) {
  if (!schema || typeof schema !== 'object') return { type: 'object', properties: {} };
  const out = { ...schema };
  if (typeof out.type === 'string') {
    out.type = out.type.toLowerCase();
  }
  if (out.properties && typeof out.properties === 'object') {
    const props = {};
    for (const [k, v] of Object.entries(out.properties)) {
      props[k] = toLowerCaseSchemaTypes(v);
    }
    out.properties = props;
  }
  if (out.items) {
    out.items = toLowerCaseSchemaTypes(out.items);
  }
  return out;
}

function buildOllamaTools(tools = []) {
  if (!Array.isArray(tools) || tools.length === 0) return null;
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description || '',
      parameters: toLowerCaseSchemaTypes(t.parameters || { type: 'object', properties: {} })
    }
  }));
}

function buildOllamaMessages(messages = [], system = '', imageBase64 = null) {
  const result = [];
  if (system && String(system).trim()) {
    result.push({ role: 'system', content: String(system).trim() });
  }

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m) continue;

    if (m.role === 'tool') {
      result.push({
        role: 'tool',
        name: m.name || 'tool',
        content:
          typeof m.content === 'string'
            ? m.content
            : JSON.stringify(m.result ?? {})
      });
      continue;
    }

    const role = m.role === 'model' ? 'assistant' : m.role;
    const msgObj = {
      role,
      content: String(m.content || '')
    };

    if (Array.isArray(m.toolCalls) && m.toolCalls.length > 0) {
      msgObj.tool_calls = m.toolCalls.map((tc) => ({
        function: {
          name: tc.name,
          arguments: tc.args || {}
        }
      }));
    }

    // Attach base64 image to the last user message when present
    if (imageBase64 && i === messages.length - 1 && role === 'user') {
      msgObj.images = [imageBase64.replace(/^data:[^;]+;base64,/, '')];
    }
    result.push(msgObj);
  }

  return result;
}

async function callOllamaChat({
  model,
  messages,
  tools = null,
  temperature = 0.4,
  maxOutputTokens = 1024,
  format = undefined,
  timeoutMs = 60000
}) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/chat`;
  const ollamaTools = buildOllamaTools(tools);

  const body = {
    model,
    messages,
    stream: false,
    options: {
      temperature,
      num_predict: maxOutputTokens
    },
    ...(format ? { format } : {}),
    ...(ollamaTools ? { tools: ollamaTools } : {})
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const err = new Error(`Ollama HTTP ${res.status}: ${errBody.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const text = data?.message?.content || '';
    const rawToolCalls = data?.message?.tool_calls || [];
    const toolCalls = Array.isArray(rawToolCalls)
      ? rawToolCalls
          .filter((tc) => tc?.function?.name)
          .map((tc, idx) => {
            let parsedArgs = tc.function.arguments || {};
            if (typeof parsedArgs === 'string') {
              try {
                parsedArgs = JSON.parse(parsedArgs);
              } catch {
                parsedArgs = {};
              }
            }
            return {
              id: `ollama_call_${Date.now()}_${idx}`,
              name: tc.function.name,
              args: parsedArgs
            };
          })
      : [];

    return { text, toolCalls, model };
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Ollama request timed out after ${timeoutMs}ms`);
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function chat({
  messages = [],
  system = '',
  tools = null,
  temperature = 0.4,
  maxOutputTokens = 1024,
  timeoutMs = 60000
}) {
  const model = getChatModel();
  const ollamaMessages = buildOllamaMessages(messages, system);
  return callOllamaChat({
    model,
    messages: ollamaMessages,
    tools,
    temperature,
    maxOutputTokens,
    timeoutMs
  });
}

async function chatStream({
  messages = [],
  system = '',
  temperature = 0.4,
  maxOutputTokens = 1024,
  timeoutMs = 60000,
  onToken
}) {
  const baseUrl = getBaseUrl();
  const model = getChatModel();
  const url = `${baseUrl}/api/chat`;
  const ollamaMessages = buildOllamaMessages(messages, system);

  const body = {
    model,
    messages: ollamaMessages,
    stream: true,
    options: {
      temperature,
      num_predict: maxOutputTokens
    }
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const err = new Error(`Ollama stream HTTP ${res.status}: ${errBody.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }

    if (!res.body) {
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
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          const chunk = parsed?.message?.content || '';
          if (chunk) {
            fullText += chunk;
            if (typeof onToken === 'function') {
              onToken(chunk);
            }
          }
        } catch {
          // Ignore partial NDJSON line error
        }
      }
    }

    return { text: fullText, model };
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Ollama stream timed out after ${timeoutMs}ms`);
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function vision({
  prompt,
  imageBase64,
  system = '',
  temperature = 0.2,
  maxOutputTokens = 1024,
  format = undefined,
  timeoutMs = 60000
}) {
  if (!imageBase64) {
    throw new Error('imageBase64 is required for Ollama vision call');
  }
  const model = getVisionModel();
  const ollamaMessages = buildOllamaMessages(
    [{ role: 'user', content: String(prompt || 'Analyze this image.') }],
    system,
    imageBase64
  );

  return callOllamaChat({
    model,
    messages: ollamaMessages,
    temperature,
    maxOutputTokens,
    format,
    timeoutMs
  });
}

async function json({
  prompt,
  system = '',
  temperature = 0.2,
  maxOutputTokens = 1024,
  imageBase64 = null,
  timeoutMs = 60000
}) {
  if (imageBase64) {
    return vision({
      prompt,
      imageBase64,
      system,
      temperature,
      maxOutputTokens,
      format: 'json',
      timeoutMs
    });
  }

  const model = getChatModel();
  const ollamaMessages = buildOllamaMessages(
    [{ role: 'user', content: String(prompt) }],
    system
  );

  return callOllamaChat({
    model,
    messages: ollamaMessages,
    temperature,
    maxOutputTokens,
    format: 'json',
    timeoutMs
  });
}

async function checkHealth() {
  const configured = isConfigured();
  const baseUrl = getBaseUrl();
  const chatModel = getChatModel();
  const visionModel = getVisionModel();

  if (!configured) {
    return {
      name: 'ollama',
      configured: false,
      reachable: false,
      baseUrl,
      model: chatModel,
      visionModel,
      reason: 'OLLAMA_ENABLED is false'
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });

    if (!res.ok) {
      return {
        name: 'ollama',
        configured: true,
        reachable: false,
        baseUrl,
        model: chatModel,
        visionModel,
        reason: `HTTP ${res.status}`
      };
    }

    const data = await res.json().catch(() => ({}));
    const installedModels = Array.isArray(data.models)
      ? data.models.map((m) => m.name)
      : [];

    return {
      name: 'ollama',
      configured: true,
      reachable: true,
      baseUrl,
      model: chatModel,
      visionModel,
      installedModels
    };
  } catch (err) {
    return {
      name: 'ollama',
      configured: true,
      reachable: false,
      baseUrl,
      model: chatModel,
      visionModel,
      reason: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  name: 'ollama',
  isCloud: false,
  isConfigured,
  getModel: getChatModel,
  getVisionModel,
  checkHealth,
  chat,
  chatStream,
  vision,
  json
};


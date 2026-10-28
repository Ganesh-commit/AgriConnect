/**
 * Multi-Provider LLM Layer with Automatic Fallback Chain
 * Supports:
 *   - "gemini" (Primary Cloud, free-tier Flash model via @google/genai or official REST)
 *   - "ollama" (Local Fallback / Privacy Mode via native /api/chat)
 *   - "anthropic" (Optional Stub for future paid use)
 *
 * Features:
 *   - Configurable priority order via LLM_PROVIDER_ORDER=gemini,ollama
 *   - Exponential backoff with jitter on HTTP 429 / 5xx (max 2 retries) before falling back
 *   - Automatic PII scrubbing before sending text to any cloud provider
 *   - LLM_PRIVACY_MODE=true forces local-only (Ollama) when containsUserData=true
 *   - In-memory LRU + TTL response cache
 *   - Zod schema validation with 1 automatic self-correction retry on invalid JSON
 */

const geminiProvider = require('./providers/geminiProvider');
const ollamaProvider = require('./providers/ollamaProvider');
const anthropicProvider = require('./providers/anthropicProvider');
const { scrubText, scrubMessages } = require('./piiScrubber');
const {
  z,
  parseJsonFromText,
  validateWithSchema,
  describeSchemaForPrompt
} = require('./schemaValidator');
const llmCache = require('./cache');

const PROVIDERS = {
  gemini: geminiProvider,
  ollama: ollamaProvider,
  anthropic: anthropicProvider
};

function getProviderOrder() {
  const raw = process.env.LLM_PROVIDER_ORDER || 'gemini,ollama';
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((name) => Boolean(PROVIDERS[name]));
  return list.length > 0 ? list : ['gemini', 'ollama'];
}

function getTimeoutMs() {
  const ms = parseInt(process.env.LLM_TIMEOUT_MS, 10);
  return !Number.isNaN(ms) && ms > 0 ? ms : 60000;
}

function getMaxInputChars() {
  const max = parseInt(process.env.LLM_MAX_INPUT_CHARS, 10);
  return !Number.isNaN(max) && max > 0 ? max : 12000;
}

function getMaxOutputTokens() {
  const max = parseInt(process.env.LLM_MAX_OUTPUT_TOKENS, 10);
  return !Number.isNaN(max) && max > 0 ? max : 1024;
}

function isPrivacyModeEnabled() {
  return String(process.env.LLM_PRIVACY_MODE || '').toLowerCase() === 'true';
}

/**
 * Truncates input text to LLM_MAX_INPUT_CHARS to enforce input size limits.
 */
function enforceInputLimit(text) {
  if (!text || typeof text !== 'string') return '';
  const maxChars = getMaxInputChars();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n...[truncated to ${maxChars} chars]`;
}

function enforceMessagesLimit(messages = []) {
  const maxChars = getMaxInputChars();
  let total = 0;
  const trimmed = [];

  // Keep most recent messages within maxChars budget, preserving tool & toolCalls messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg) continue;
    const rawContent =
      typeof msg.content === 'string'
        ? msg.content
        : msg.result
        ? JSON.stringify(msg.result)
        : '';
    const hasToolCalls = Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0;
    if (!rawContent && !hasToolCalls && msg.role !== 'tool') continue;

    const content =
      rawContent.length > maxChars ? rawContent.slice(0, maxChars) : rawContent;
    if (total + content.length > maxChars && trimmed.length > 0) {
      break;
    }
    total += content.length;
    trimmed.unshift({ ...msg, content });
  }
  return trimmed;
}

/**
 * Checks if an error is retryable (HTTP 429 rate limit or 5xx server error).
 */
function isRetryableStatus(err) {
  const status = err?.status || err?.statusCode;
  if (status === 429 || (status >= 500 && status <= 599)) {
    return true;
  }
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('500') ||
    msg.includes('overloaded')
  );
}

/**
 * Executes `fn` with exponential backoff + jitter on 429 / 5xx (max 2 retries).
 */
async function withRetryBackoff(fn, providerName, maxRetries = 2) {
  const baseDelayMs = parseInt(process.env.LLM_RETRY_BASE_MS, 10) || 400;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxRetries || !isRetryableStatus(err)) {
        throw err;
      }
      attempt += 1;
      const jitter = Math.floor(Math.random() * 200);
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
      console.warn(
        `[LLM] Provider "${providerName}" returned retryable error (${err.message}). Retry ${attempt}/${maxRetries} in ${delay}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Selects eligible providers in priority order, applying privacy mode and configuration checks.
 */
function resolveActiveProviders({ containsUserData = false, preferredProvider = null } = {}) {
  const order = preferredProvider
    ? [preferredProvider.toLowerCase()]
    : getProviderOrder();

  const privacyForcedLocal = isPrivacyModeEnabled() && containsUserData;

  const candidates = [];
  for (const name of order) {
    const provider = PROVIDERS[name];
    if (!provider) continue;

    // Skip cloud providers if LLM_PRIVACY_MODE=true and prompt contains user data
    if (privacyForcedLocal && provider.isCloud) {
      console.info(
        `[LLM] Skipping cloud provider "${name}" because LLM_PRIVACY_MODE=true and request contains user-specific data.`
      );
      continue;
    }

    // Silently skip unconfigured providers
    if (!provider.isConfigured()) {
      continue;
    }

    candidates.push(provider);
  }

  return candidates;
}

/**
 * Scrubs messages/prompt/system if target provider is a cloud provider.
 */
function prepareInputsForProvider(provider, { messages, prompt, system, piiOptions }) {
  const cleanSystem = enforceInputLimit(system || '');
  const cleanPrompt = enforceInputLimit(prompt || '');
  const cleanMessages = enforceMessagesLimit(messages || []);

  if (!provider.isCloud) {
    return {
      messages: cleanMessages,
      prompt: cleanPrompt,
      system: cleanSystem
    };
  }

  return {
    messages: scrubMessages(cleanMessages, piiOptions),
    prompt: scrubText(cleanPrompt, piiOptions),
    system: scrubText(cleanSystem, piiOptions)
  };
}

/**
 * Fallback intent-detection step for models/providers that do not support native tool calling.
 * Asks the LLM to output JSON { needsData: boolean, tool?: string, args?: object }.
 */
async function detectToolIntentViaJson(provider, { messages, system, tools, timeoutMs }) {
  const hasPriorToolMessages = messages.some((m) => m.role === 'tool');
  if (hasPriorToolMessages || !Array.isArray(tools) || tools.length === 0) {
    return null;
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMsg || !lastUserMsg.content) return null;

  const toolSummaries = tools
    .map((t) => `- ${t.name}: ${t.description} | params: ${JSON.stringify(t.parameters || {})}`)
    .join('\n');

  const intentPrompt = `Decide if the user's message requires querying live AgriConnect marketplace data using one of these tools:
${toolSummaries}

User message: "${lastUserMsg.content}"

Respond with valid JSON ONLY matching:
{"needsData": boolean, "tool": string or null, "args": object}`;

  try {
    const res = await provider.json({
      prompt: intentPrompt,
      system: system || 'You are a tool router that outputs strict JSON.',
      temperature: 0.1,
      maxOutputTokens: 256,
      timeoutMs
    });
    const parsed = parseJsonFromText(res.text);
    if (parsed && parsed.needsData && parsed.tool && tools.some((t) => t.name === parsed.tool)) {
      return {
        text: '',
        toolCalls: [
          {
            id: `intent_${Date.now()}`,
            name: parsed.tool,
            args: parsed.args && typeof parsed.args === 'object' ? parsed.args : {}
          }
        ],
        model: res.model
      };
    }
  } catch {
    // Fall through to standard chat completion
  }
  return null;
}

/**
 * 1. chat({ messages, system, tools, temperature, ... })
 * Returns either final text or toolCalls: [{ id, name, args }].
 */
async function chat({
  messages = [],
  system = '',
  tools = null,
  temperature = 0.4,
  containsUserData = false,
  piiOptions = {},
  useCache = true,
  cacheTtlSeconds = undefined,
  preferredProvider = null,
  mockFallback = null
} = {}) {
  const timeoutMs = getTimeoutMs();
  const maxOutputTokens = getMaxOutputTokens();
  const hasTools = Array.isArray(tools) && tools.length > 0;

  // Never cache tool-enabled chat turns so marketplace data is always queried live
  const cacheKey =
    useCache && !hasTools
      ? llmCache.buildKey({ type: 'chat', messages, system, temperature })
      : null;

  if (cacheKey) {
    const cached = llmCache.get(cacheKey);
    if (cached) {
      console.info(`[LLM] Cache hit for chat (provider="${cached.provider}" model="${cached.model}")`);
      return {
        ...cached,
        cached: true,
        meta: { ...cached.meta, cached: true, latencyMs: 0 }
      };
    }
  }

  const providers = resolveActiveProviders({ containsUserData, preferredProvider });
  const errors = [];

  for (let idx = 0; idx < providers.length; idx++) {
    const provider = providers[idx];
    const startMs = Date.now();
    try {
      const prepared = prepareInputsForProvider(provider, {
        messages,
        system,
        piiOptions
      });

      let res;
      try {
        res = await withRetryBackoff(
          () =>
            provider.chat({
              messages: prepared.messages,
              system: prepared.system,
              tools: hasTools ? tools : null,
              temperature,
              maxOutputTokens,
              timeoutMs
            }),
          provider.name
        );
      } catch (toolErr) {
        // If the model/provider does not support native tool calling, fall back to JSON intent detection
        if (hasTools) {
          const intentRes = await detectToolIntentViaJson(provider, {
            messages: prepared.messages,
            system: prepared.system,
            tools,
            timeoutMs
          });
          if (intentRes) {
            res = intentRes;
          } else {
            res = await provider.chat({
              messages: prepared.messages.filter((m) => m.role !== 'tool'),
              system: prepared.system,
              tools: null,
              temperature,
              maxOutputTokens,
              timeoutMs
            });
          }
        } else {
          throw toolErr;
        }
      }

      const latencyMs = Date.now() - startMs;
      const meta = {
        provider: provider.name,
        model: res.model,
        latencyMs,
        cached: false,
        fallbackUsed: idx > 0
      };

      const toolCalls = Array.isArray(res.toolCalls) ? res.toolCalls : [];

      console.info(
        `[LLM] chat answered by provider="${meta.provider}" model="${meta.model}" toolCalls=${toolCalls.length} latencyMs=${meta.latencyMs}`
      );

      const output = {
        text: res.text || '',
        toolCalls,
        provider: meta.provider,
        model: meta.model,
        latencyMs: meta.latencyMs,
        cached: false,
        meta
      };

      if (cacheKey && res.text && toolCalls.length === 0) {
        llmCache.set(cacheKey, output, cacheTtlSeconds);
      }

      return output;
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
      console.warn(`[LLM] Provider "${provider.name}" failed for chat: ${err.message}`);
    }
  }

  if (typeof mockFallback === 'function') {
    const fallbackResult = await mockFallback();
    if (fallbackResult && typeof fallbackResult === 'object' && Array.isArray(fallbackResult.toolCalls)) {
      return {
        text: fallbackResult.text || '',
        toolCalls: fallbackResult.toolCalls,
        provider: 'mock',
        model: 'offline-fallback',
        latencyMs: 1,
        cached: false,
        meta: {
          provider: 'mock',
          model: 'offline-fallback',
          latencyMs: 1,
          cached: false,
          fallbackUsed: true
        }
      };
    }
    const fallbackText = typeof fallbackResult === 'string' ? fallbackResult : '';
    return {
      text: fallbackText,
      toolCalls: [],
      provider: 'mock',
      model: 'offline-fallback',
      latencyMs: 1,
      cached: false,
      meta: {
        provider: 'mock',
        model: 'offline-fallback',
        latencyMs: 1,
        cached: false,
        fallbackUsed: true
      }
    };
  }

  const error = new Error(
    errors.length > 0
      ? `All configured LLM providers failed (${errors.join(' | ')})`
      : 'No LLM provider is configured or reachable.'
  );
  error.code = 'LLM_UNAVAILABLE';
  error.status = 503;
  throw error;
}

/**
 * 2. chatStream({ messages, system, temperature, onToken, ... })
 */
async function chatStream({
  messages = [],
  system = '',
  temperature = 0.4,
  containsUserData = false,
  piiOptions = {},
  onToken = null,
  preferredProvider = null,
  mockFallback = null
} = {}) {
  const timeoutMs = getTimeoutMs();
  const maxOutputTokens = getMaxOutputTokens();
  const providers = resolveActiveProviders({ containsUserData, preferredProvider });
  const errors = [];

  for (let idx = 0; idx < providers.length; idx++) {
    const provider = providers[idx];
    const startMs = Date.now();
    let emittedTokens = false;

    try {
      const prepared = prepareInputsForProvider(provider, {
        messages,
        system,
        piiOptions
      });

      const res = await withRetryBackoff(
        () =>
          provider.chatStream({
            messages: prepared.messages,
            system: prepared.system,
            temperature,
            maxOutputTokens,
            timeoutMs,
            onToken: (chunk) => {
              emittedTokens = true;
              if (typeof onToken === 'function') onToken(chunk);
            }
          }),
        provider.name,
        emittedTokens ? 0 : 2
      );

      const latencyMs = Date.now() - startMs;
      const meta = {
        provider: provider.name,
        model: res.model,
        latencyMs,
        cached: false,
        fallbackUsed: idx > 0
      };

      console.info(
        `[LLM] chatStream answered by provider="${meta.provider}" model="${meta.model}" latencyMs=${meta.latencyMs}`
      );

      return {
        text: res.text,
        provider: meta.provider,
        model: meta.model,
        latencyMs: meta.latencyMs,
        meta
      };
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
      console.warn(`[LLM] Provider "${provider.name}" failed for chatStream: ${err.message}`);
    }
  }

  if (typeof mockFallback === 'function') {
    const fallbackText = await mockFallback();
    if (typeof onToken === 'function' && fallbackText) {
      const words = fallbackText.split(' ');
      for (let i = 0; i < words.length; i++) {
        onToken((i === 0 ? '' : ' ') + words[i]);
      }
    }
    return {
      text: fallbackText,
      provider: 'mock',
      model: 'offline-fallback',
      latencyMs: 5,
      meta: {
        provider: 'mock',
        model: 'offline-fallback',
        latencyMs: 5,
        cached: false,
        fallbackUsed: true
      }
    };
  }

  const error = new Error(
    errors.length > 0
      ? `All configured LLM providers failed (${errors.join(' | ')})`
      : 'No LLM provider is configured or reachable.'
  );
  error.code = 'LLM_UNAVAILABLE';
  error.status = 503;
  throw error;
}

/**
 * 3. vision({ prompt, imageBase64, mimeType, system, temperature, ... })
 */
async function vision({
  prompt,
  imageBase64,
  mimeType = 'image/jpeg',
  system = '',
  temperature = 0.2,
  containsUserData = false,
  piiOptions = {},
  preferredProvider = null,
  mockFallback = null
} = {}) {
  const timeoutMs = getTimeoutMs();
  const maxOutputTokens = getMaxOutputTokens();
  const providers = resolveActiveProviders({ containsUserData, preferredProvider });
  const errors = [];

  for (let idx = 0; idx < providers.length; idx++) {
    const provider = providers[idx];
    const startMs = Date.now();
    try {
      const prepared = prepareInputsForProvider(provider, {
        prompt,
        system,
        piiOptions
      });

      const res = await withRetryBackoff(
        () =>
          provider.vision({
            prompt: prepared.prompt,
            imageBase64,
            mimeType,
            system: prepared.system,
            temperature,
            maxOutputTokens,
            timeoutMs
          }),
        provider.name
      );

      const latencyMs = Date.now() - startMs;
      const meta = {
        provider: provider.name,
        model: res.model,
        latencyMs,
        cached: false,
        fallbackUsed: idx > 0
      };

      console.info(
        `[LLM] vision answered by provider="${meta.provider}" model="${meta.model}" latencyMs=${meta.latencyMs}`
      );

      return {
        text: res.text,
        provider: meta.provider,
        model: meta.model,
        latencyMs: meta.latencyMs,
        meta
      };
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
      console.warn(`[LLM] Provider "${provider.name}" failed for vision: ${err.message}`);
    }
  }

  if (typeof mockFallback === 'function') {
    const fallbackText = await mockFallback();
    return {
      text: typeof fallbackText === 'string' ? fallbackText : JSON.stringify(fallbackText),
      provider: 'mock',
      model: 'offline-fallback',
      latencyMs: 5,
      meta: {
        provider: 'mock',
        model: 'offline-fallback',
        latencyMs: 5,
        cached: false,
        fallbackUsed: true
      }
    };
  }

  const error = new Error(
    errors.length > 0
      ? `All configured vision providers failed (${errors.join(' | ')})`
      : 'No vision LLM provider is configured or reachable.'
  );
  error.code = 'LLM_UNAVAILABLE';
  error.status = 503;
  throw error;
}

/**
 * 4. json({ prompt, schema, system, temperature, imageBase64, mimeType, ... })
 * Forces JSON output, validates against `schema` (Zod), and retries once on invalid JSON.
 */
async function json({
  prompt,
  schema = null,
  system = '',
  temperature = 0.2,
  imageBase64 = null,
  mimeType = 'image/jpeg',
  containsUserData = false,
  piiOptions = {},
  useCache = true,
  cacheTtlSeconds = undefined,
  preferredProvider = null,
  mockFallback = null
} = {}) {
  const timeoutMs = getTimeoutMs();
  const maxOutputTokens = getMaxOutputTokens();

  const schemaDesc = describeSchemaForPrompt(schema);
  const cacheKey =
    useCache && !imageBase64
      ? llmCache.buildKey({ type: 'json', prompt, system, schemaDesc, temperature })
      : null;

  if (cacheKey) {
    const cached = llmCache.get(cacheKey);
    if (cached) {
      console.info(`[LLM] Cache hit for json (provider="${cached.provider}" model="${cached.model}")`);
      return {
        ...cached,
        cached: true,
        meta: { ...cached.meta, cached: true, latencyMs: 0 }
      };
    }
  }

  const providers = resolveActiveProviders({ containsUserData, preferredProvider });
  const errors = [];

  for (let idx = 0; idx < providers.length; idx++) {
    const provider = providers[idx];
    const startMs = Date.now();

    try {
      const prepared = prepareInputsForProvider(provider, {
        prompt,
        system,
        piiOptions
      });

      const baseJsonSystem = `${
        prepared.system ? `${prepared.system}\n` : ''
      }You MUST respond with valid JSON only (no markdown fences, no extra prose). Required schema: ${schemaDesc}`;

      let validatedData = null;
      let rawText = '';
      let usedModel = provider.getModel();

      // Try initial JSON generation + up to 1 validation retry if JSON/schema is invalid
      let lastValidationError = null;
      for (let jsonAttempt = 0; jsonAttempt < 2; jsonAttempt++) {
        const attemptPrompt =
          jsonAttempt === 0
            ? prepared.prompt
            : `${prepared.prompt}\n\nIMPORTANT CORRECTION: Your previous output failed JSON schema validation with error: "${lastValidationError}". Return ONLY a valid JSON object conforming strictly to: ${schemaDesc}`;

        const res = await withRetryBackoff(
          () =>
            provider.json({
              prompt: attemptPrompt,
              system: baseJsonSystem,
              temperature,
              maxOutputTokens,
              imageBase64,
              mimeType,
              timeoutMs
            }),
          provider.name
        );

        rawText = res.text;
        usedModel = res.model;

        try {
          const parsed = parseJsonFromText(rawText);
          validatedData = validateWithSchema(parsed, schema);
          lastValidationError = null;
          break;
        } catch (valErr) {
          lastValidationError = valErr.message;
          console.warn(
            `[LLM] Provider "${provider.name}" JSON validation failed (attempt ${jsonAttempt + 1}/2): ${valErr.message}`
          );
        }
      }

      if (lastValidationError !== null) {
        throw new Error(`Invalid JSON output after retry: ${lastValidationError}`);
      }

      const latencyMs = Date.now() - startMs;
      const meta = {
        provider: provider.name,
        model: usedModel,
        latencyMs,
        cached: false,
        fallbackUsed: idx > 0
      };

      console.info(
        `[LLM] json answered by provider="${meta.provider}" model="${meta.model}" latencyMs=${meta.latencyMs}`
      );

      const output = {
        data: validatedData,
        text: rawText,
        provider: meta.provider,
        model: meta.model,
        latencyMs: meta.latencyMs,
        cached: false,
        meta
      };

      if (cacheKey) {
        llmCache.set(cacheKey, output, cacheTtlSeconds);
      }

      return output;
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
      console.warn(`[LLM] Provider "${provider.name}" failed for json: ${err.message}`);
    }
  }

  if (typeof mockFallback === 'function') {
    const fallbackObj = await mockFallback();
    const validated = schema ? validateWithSchema(fallbackObj, schema) : fallbackObj;
    return {
      data: validated,
      text: JSON.stringify(validated),
      provider: 'mock',
      model: 'offline-fallback',
      latencyMs: 2,
      cached: false,
      meta: {
        provider: 'mock',
        model: 'offline-fallback',
        latencyMs: 2,
        cached: false,
        fallbackUsed: true
      }
    };
  }

  const error = new Error(
    errors.length > 0
      ? `All configured LLM providers failed for JSON request (${errors.join(' | ')})`
      : 'No LLM provider is configured or reachable.'
  );
  error.code = 'LLM_UNAVAILABLE';
  error.status = 503;
  throw error;
}

/**
 * Health diagnostics across all providers in fallback order.
 */
async function getHealthStatus() {
  const fallbackOrder = getProviderOrder();
  const providerNames = Array.from(new Set([...fallbackOrder, 'gemini', 'ollama', 'anthropic']));

  const checks = await Promise.all(
    providerNames.map((name) => PROVIDERS[name].checkHealth())
  );

  const providerMap = {};
  for (const c of checks) {
    providerMap[c.name] = c;
  }

  const activeProviders = fallbackOrder
    .map((name) => providerMap[name])
    .filter((p) => p && p.configured && p.reachable);

  const anyAvailable = activeProviders.length > 0;

  return {
    available: anyAvailable,
    primaryProvider: activeProviders[0]?.name || null,
    fallbackOrder,
    privacyMode: isPrivacyModeEnabled(),
    limits: {
      timeoutMs: getTimeoutMs(),
      maxInputChars: getMaxInputChars(),
      maxOutputTokens: getMaxOutputTokens()
    },
    cache: llmCache.stats(),
    providers: checks,
    uiNotice: anyAvailable
      ? 'AI replies are suggestions and may be imperfect.'
      : 'No AI provider is currently reachable. Set GEMINI_API_KEY in server/.env or start local Ollama (http://localhost:11434). Features will use sample/mock fallbacks.'
  };
}

module.exports = {
  chat,
  chatStream,
  vision,
  json,
  getHealthStatus,
  getProviderOrder,
  z,
  scrubText,
  scrubMessages,
  llmCache,
  PROVIDERS
};


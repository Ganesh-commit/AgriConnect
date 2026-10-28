/**
 * PII Scrubber for Cloud LLM Requests
 * Masks phone numbers, emails, Aadhaar/PAN, addresses, tokens, passwords, and optional known user names
 * before any text is sent to a cloud LLM provider.
 */

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
// Matches Indian +91 / 0-prefixed or standalone 10-digit mobile numbers & general phone formats
const PHONE_REGEX = /(?:(?:\+|00)?91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}\b|\b(?:\+?\d{1,3}[\s.-]?)?\(?\d{3,4}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
// Matches JWT tokens (eyJ...)
const JWT_REGEX = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
// Matches key/password assignments in plain text
const SECRET_KV_REGEX = /\b(password|passwd|pwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*([^\s,;]+)/gi;
// Matches Indian 6-digit PIN codes when preceded by address indicators or standalone pin patterns
const ADDRESS_LINE_REGEX = /\b(?:(?:d\.?no|door\s*no|flat\s*no|plot\s*no|house\s*no|h\.?no|shop\s*no|ward\s*no)[\s.:#-]*[A-Za-z0-9/-]+(?:,\s*[A-Za-z0-9\s.-]+){1,4})\b/gi;
const PINCODE_REGEX = /\b(?:pin(?:\s*code)?\s*[:=-]?\s*)([1-8]\d{5})\b/gi;
// Matches 12-digit Aadhaar-like numbers
const AADHAAR_REGEX = /\b\d{4}[\s-]\d{4}[\s-]\d{4}\b/g;

/**
 * Scrubs PII from a string.
 * @param {string} text - Input text to scrub
 * @param {Object} [options] - Optional known PII values (e.g. { names: ['Ramesh Patel'], phones: [], emails: [], addresses: [] })
 * @returns {string} Scrubbed text
 */
function scrubText(text, options = {}) {
  if (!text || typeof text !== 'string') return text;

  let scrubbed = text;

  // 1. Strip JWTs and secret key-value pairs first
  scrubbed = scrubbed.replace(JWT_REGEX, '[TOKEN_REDACTED]');
  scrubbed = scrubbed.replace(SECRET_KV_REGEX, '$1: [SECRET_REDACTED]');

  // 2. Strip emails and phone numbers
  scrubbed = scrubbed.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
  scrubbed = scrubbed.replace(AADHAAR_REGEX, '[ID_REDACTED]');
  scrubbed = scrubbed.replace(PHONE_REGEX, '[PHONE_REDACTED]');

  // 3. Strip PIN codes first, then street/door addresses
  scrubbed = scrubbed.replace(PINCODE_REGEX, 'PIN: [PIN_REDACTED]');
  scrubbed = scrubbed.replace(ADDRESS_LINE_REGEX, '[ADDRESS_REDACTED]');

  // 4. Strip known user-specific names/addresses/emails/phones if provided
  const { names = [], addresses = [], emails = [], phones = [] } = options;

  for (const email of emails) {
    if (email && typeof email === 'string' && email.trim().length > 2) {
      scrubbed = scrubbed.split(email.trim()).join('[EMAIL_REDACTED]');
    }
  }

  for (const phone of phones) {
    if (phone && typeof phone === 'string' && phone.trim().length > 4) {
      scrubbed = scrubbed.split(phone.trim()).join('[PHONE_REDACTED]');
    }
  }

  for (const addr of addresses) {
    if (addr && typeof addr === 'string' && addr.trim().length > 4) {
      const escaped = addr.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      scrubbed = scrubbed.replace(new RegExp(escaped, 'gi'), '[ADDRESS_REDACTED]');
    }
  }

  for (const name of names) {
    if (name && typeof name === 'string' && name.trim().length > 2) {
      const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      scrubbed = scrubbed.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[NAME_REDACTED]');
    }
  }

  return scrubbed;
}

/**
 * Scrubs an array of chat messages [{ role, content }] without mutating the original array.
 * @param {Array<{role: string, content: string}>} messages
 * @param {Object} [options]
 * @returns {Array<{role: string, content: string}>}
 */
function scrubMessages(messages = [], options = {}) {
  if (!Array.isArray(messages)) return [];
  return messages.map((msg) => ({
    ...msg,
    content: typeof msg.content === 'string' ? scrubText(msg.content, options) : msg.content
  }));
}

/**
 * Scrubs a user object or context payload so passwords, tokens, phones, emails, and exact addresses are never leaked.
 * @param {Object} obj
 * @returns {Object}
 */
function scrubObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => scrubObject(item, options));

  const FORBIDDEN_KEYS = new Set([
    'password',
    'token',
    'refreshToken',
    'jwt',
    'secret',
    'apiKey',
    'firebaseUid',
    'otp'
  ]);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (key === 'email') {
      result[key] = '[EMAIL_REDACTED]';
    } else if (key === 'phone') {
      result[key] = '[PHONE_REDACTED]';
    } else if (key === 'name' && options.scrubNames !== false) {
      result[key] = '[NAME_REDACTED]';
    } else if (typeof value === 'string') {
      result[key] = scrubText(value, options);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = scrubObject(value, options);
    } else {
      result[key] = value;
    }
  }
  return result;
}

module.exports = {
  scrubText,
  scrubMessages,
  scrubObject
};

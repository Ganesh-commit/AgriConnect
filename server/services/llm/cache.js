const crypto = require('crypto');

/**
 * In-Memory LRU Cache with TTL for LLM Responses
 * Controlled by env:
 *   LLM_CACHE_TTL_SECONDS (default: 3600)
 *   LLM_CACHE_MAX_ITEMS (default: 500)
 */
class LlmResponseCache {
  constructor() {
    this.store = new Map();
  }

  get ttlMs() {
    const sec = parseInt(process.env.LLM_CACHE_TTL_SECONDS, 10);
    return (!Number.isNaN(sec) && sec >= 0 ? sec : 3600) * 1000;
  }

  get maxItems() {
    const max = parseInt(process.env.LLM_CACHE_MAX_ITEMS, 10);
    return !Number.isNaN(max) && max > 0 ? max : 500;
  }

  /**
   * Builds a deterministic SHA-256 cache key from request parameters.
   */
  buildKey(payload) {
    const serialized = JSON.stringify(payload);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  get(key) {
    if (this.ttlMs === 0) return null;
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value, customTtlSeconds) {
    const ttl =
      typeof customTtlSeconds === 'number' ? customTtlSeconds * 1000 : this.ttlMs;
    if (ttl <= 0) return;

    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxItems) {
      // Evict oldest (first key in Map iteration order)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  clear() {
    this.store.clear();
  }

  stats() {
    // Purge expired items before reporting size
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (now > v.expiresAt) this.store.delete(k);
    }
    return {
      size: this.store.size,
      maxItems: this.maxItems,
      ttlSeconds: Math.round(this.ttlMs / 1000)
    };
  }
}

module.exports = new LlmResponseCache();


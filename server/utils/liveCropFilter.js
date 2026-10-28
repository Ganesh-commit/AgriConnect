const User = require('../models/User');

/**
 * Escapes special regex characters to prevent ReDoS or regex injection.
 */
function escapeRegex(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitizes a string parameter: strips "$" prefixes, trims, and clamps length.
 */
function sanitizeString(value, maxLen = 100) {
  if (typeof value !== 'string') return '';
  return value.replace(/\$/g, '').trim().slice(0, maxLen);
}

/**
 * Recursively strips any keys starting with "$" or containing "." from an object.
 */
function stripMongoOperators(input) {
  if (Array.isArray(input)) {
    return input.map(stripMongoOperators);
  }
  if (input && typeof input === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(input)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      clean[k] = stripMongoOperators(v);
    }
    return clean;
  }
  return input;
}

/**
 * Shared synchronous base filter for live, available, non-deleted crops with positive stock.
 * Used across search, aggregations, chatTools, and /api/crops routes.
 */
function liveCropFilter(extra = {}) {
  return {
    isDeleted: { $ne: true },
    status: 'available',
    quantity: { $gt: 0 },
    ...extra
  };
}

/**
 * Async version of liveCropFilter that also excludes crops belonging to blocked farmers.
 */
async function getLiveCropQuery(extra = {}) {
  const base = liveCropFilter(extra);
  try {
    const blockedUsers = await User.find({ isBlocked: true }).select('_id').lean();
    if (blockedUsers && blockedUsers.length > 0) {
      const blockedIds = blockedUsers.map((u) => u._id);
      if (!base.farmer) {
        base.farmer = { $nin: blockedIds };
      }
    }
  } catch {
    // If User lookup fails, still enforce base liveCropFilter
  }
  return base;
}

module.exports = {
  liveCropFilter,
  getLiveCropQuery,
  escapeRegex,
  sanitizeString,
  stripMongoOperators
};


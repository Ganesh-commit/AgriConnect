const rateLimit = require('express-rate-limit');

const FRIENDLY_QUOTA_MESSAGE = {
  success: false,
  message: 'AI is busy, try again in a minute',
  data: null
};

const aiGlobalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: () => parseInt(process.env.AI_GLOBAL_RATE_LIMIT_PER_MIN, 10) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: FRIENDLY_QUOTA_MESSAGE
});

const aiUserLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: () => parseInt(process.env.AI_USER_RATE_LIMIT_PER_MIN, 10) || 15,
  keyGenerator: (req) => {
    if (req.user && req.user._id) {
      return `user:${req.user._id.toString()}`;
    }
    return `ip:${req.ip || req.connection?.remoteAddress || 'anon'}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: FRIENDLY_QUOTA_MESSAGE
});

module.exports = {
  aiGlobalLimiter,
  aiUserLimiter,
  FRIENDLY_QUOTA_MESSAGE
};


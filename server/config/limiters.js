const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { reply: 'Слишком много запросов. Подождите минуту.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, error: 'Слишком много загрузок. Подождите минуту.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

module.exports = { aiLimiter, uploadLimiter };

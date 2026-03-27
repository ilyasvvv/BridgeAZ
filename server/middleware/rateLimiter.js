const rateLimit = require("express-rate-limit");

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message }
  });

// Auth: 15 requests per minute (login, register, forgot-password)
const authLimiter = createLimiter(
  60 * 1000,
  15,
  "Too many auth attempts. Please try again later."
);

// Posts: 10 per minute
const postLimiter = createLimiter(
  60 * 1000,
  10,
  "Too many posts. Please slow down."
);

// Search: 30 per minute
const searchLimiter = createLimiter(
  60 * 1000,
  30,
  "Too many search requests. Please slow down."
);

// Connections/mentorship: 20 per minute
const connectionLimiter = createLimiter(
  60 * 1000,
  20,
  "Too many connection requests. Please slow down."
);

// Chat: 30 per minute
const chatLimiter = createLimiter(
  60 * 1000,
  30,
  "Too many messages. Please slow down."
);

// General API: 100 per minute
const generalLimiter = createLimiter(
  60 * 1000,
  100,
  "Too many requests. Please slow down."
);

module.exports = {
  authLimiter,
  postLimiter,
  searchLimiter,
  connectionLimiter,
  chatLimiter,
  generalLimiter
};

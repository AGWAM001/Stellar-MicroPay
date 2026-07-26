/**
 * src/middleware/rateLimit.js
 * Dedicated rate limiters for different route sensitivity levels.
 */

"use strict";

const rateLimit = require("express-rate-limit");

/**
 * Read-only rate limiting — 20 requests per minute.
 * Applied to analytics, tips, federation, and account registration routes.
 *
 * standardHeaders: true  → emits RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset.
 * legacyHeaders: false   → suppresses deprecated X-RateLimit-* headers.
 */
const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests to sensitive routes, please wait 1 minute." },
});

/**
 * Payment/turret rate limiting — 10 requests per minute.
 * Applied to payments and turrets routes.
 *
 * standardHeaders: true  → emits RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset.
 * legacyHeaders: false   → suppresses deprecated X-RateLimit-* headers.
 */
const paymentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests to payment/turret routes, please wait 1 minute." },
});

/**
 * Sensitive route limiting — 10 requests per minute (#205).
 * Applied to account lookup and balance endpoints that could be used for
 * account enumeration.
 */
const sensitiveLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests to this endpoint, please wait 1 minute." },
});

module.exports = { strictLimiter, paymentLimiter, sensitiveLimiter };

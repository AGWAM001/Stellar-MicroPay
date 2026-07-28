/**
 * __tests__/rateLimit.test.js
 * Isolated unit tests for the strict/sensitive rate limiters (#534) — the
 * global and per-route limits documented in docs/api.md.
 *
 * Each test mounts the real exported limiter on a throwaway Express app (not
 * the full server) and gives every test its own fake client IP via
 * `X-Forwarded-For`, so hit counts from one test never leak into another even
 * though `strictLimiter`/`sensitiveLimiter` are process-wide singletons with
 * their own in-memory store.
 */

"use strict";

const express = require("express");
const request = require("supertest");
const { strictLimiter, sensitiveLimiter } = require("../src/middleware/rateLimit");

function buildApp(limiter) {
  const app = express();
  // trust proxy = 1 → req.ip is read from X-Forwarded-For, one hop back.
  app.set("trust proxy", 1);
  app.get("/probe", limiter, (req, res) => res.json({ ok: true }));
  return app;
}

let ipCounter = 0;
function uniqueIp() {
  ipCounter += 1;
  return `10.0.${(ipCounter >> 8) & 0xff}.${ipCounter & 0xff}`;
}

describe.each([
  ["strictLimiter", strictLimiter, 20, "Too many requests to sensitive routes, please wait 1 minute."],
  ["sensitiveLimiter", sensitiveLimiter, 10, "Too many requests to this endpoint, please wait 1 minute."],
])("%s", (_name, limiter, max, message) => {
  it(`allows ${max} requests per window through with RateLimit-* headers set`, async () => {
    const app = buildApp(limiter);
    const ip = uniqueIp();

    for (let i = 0; i < max; i++) {
      const res = await request(app).get("/probe").set("X-Forwarded-For", ip);
      expect(res.status).toBe(200);
      expect(res.headers["ratelimit-limit"]).toBe(String(max));
      expect(res.headers["ratelimit-remaining"]).toBe(String(max - i - 1));
      expect(res.headers["ratelimit-reset"]).toBeDefined();
    }
  });

  it(`returns 429 with the documented body on the ${max + 1}th request in the window`, async () => {
    const app = buildApp(limiter);
    const ip = uniqueIp();

    for (let i = 0; i < max; i++) {
      const res = await request(app).get("/probe").set("X-Forwarded-For", ip);
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).get("/probe").set("X-Forwarded-For", ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: message });
  });

  it("resets the window after it expires, allowing requests again", async () => {
    const app = buildApp(limiter);
    const ip = uniqueIp();

    for (let i = 0; i < max; i++) {
      await request(app).get("/probe").set("X-Forwarded-For", ip);
    }
    const stillBlocked = await request(app).get("/probe").set("X-Forwarded-For", ip);
    expect(stillBlocked.status).toBe(429);

    // The store only checks wall-clock time lazily (on the next hit), so
    // faking Date.now() past the 1-minute window is enough to simulate the
    // window expiring — no real waiting, and no interference with
    // supertest's own use of real timers for the HTTP request itself.
    const realNow = Date.now();
    const nowSpy = jest.spyOn(Date, "now").mockImplementation(() => realNow + 60_001);

    try {
      const afterReset = await request(app).get("/probe").set("X-Forwarded-For", ip);
      expect(afterReset.status).toBe(200);
      expect(afterReset.headers["ratelimit-remaining"]).toBe(String(max - 1));
    } finally {
      nowSpy.mockRestore();
    }
  });
});

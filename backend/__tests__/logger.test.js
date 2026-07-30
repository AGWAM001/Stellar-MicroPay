/**
 * __tests__/logger.test.js
 * Unit tests for utils/logger.js (issue #536).
 *
 * Verifies log-level filtering and the structured output format (level,
 * message, timestamp) by capturing what the logger writes to stdout.
 */

"use strict";

function requireFreshLogger() {
  jest.resetModules();
  return require("../src/utils/logger");
}

function captureStdout() {
  const lines = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk) => {
    lines.push(chunk.toString());
    return true;
  };
  return {
    lines,
    restore() {
      process.stdout.write = originalWrite;
    },
  };
}

describe("logger", () => {
  const originalLogLevel = process.env.LOG_LEVEL;
  let capture;

  afterEach(() => {
    capture?.restore();
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
  });

  describe("log-level filtering", () => {
    it("suppresses messages below the configured log level", () => {
      process.env.LOG_LEVEL = "warn";
      const logger = requireFreshLogger();
      capture = captureStdout();

      logger.info("this should be suppressed");
      logger.debug("this should also be suppressed");

      expect(capture.lines).toHaveLength(0);
    });

    it("emits messages at or above the configured log level", () => {
      process.env.LOG_LEVEL = "warn";
      const logger = requireFreshLogger();
      capture = captureStdout();

      logger.warn("this should appear");
      logger.error("this should also appear");

      expect(capture.lines).toHaveLength(2);
    });

    it("defaults to info level when LOG_LEVEL is unset", () => {
      delete process.env.LOG_LEVEL;
      const logger = requireFreshLogger();
      capture = captureStdout();

      logger.debug("suppressed by default info level");
      logger.info("visible at default info level");

      expect(logger.level).toBe("info");
      expect(capture.lines).toHaveLength(1);
    });
  });

  describe("structured output format", () => {
    it("includes level, message, and timestamp fields", () => {
      process.env.LOG_LEVEL = "info";
      const logger = requireFreshLogger();
      capture = captureStdout();

      logger.info("hello world");

      expect(capture.lines).toHaveLength(1);
      const entry = JSON.parse(capture.lines[0]);

      expect(entry.level).toBe("INFO");
      expect(entry.msg).toBe("hello world");
      expect(entry).toHaveProperty("time");
      expect(new Date(entry.time).toISOString()).toBe(entry.time);
    });

    it("uppercases the level label for each severity", () => {
      process.env.LOG_LEVEL = "debug";
      const logger = requireFreshLogger();
      capture = captureStdout();

      logger.debug("debug msg");
      logger.warn("warn msg");
      logger.error("error msg");

      const levels = capture.lines.map((line) => JSON.parse(line).level);
      expect(levels).toEqual(["DEBUG", "WARN", "ERROR"]);
    });

    it("merges structured fields passed alongside the message", () => {
      process.env.LOG_LEVEL = "info";
      const logger = requireFreshLogger();
      capture = captureStdout();

      logger.info({ userId: "abc123", action: "login" }, "user logged in");

      const entry = JSON.parse(capture.lines[0]);
      expect(entry.msg).toBe("user logged in");
      expect(entry.userId).toBe("abc123");
      expect(entry.action).toBe("login");
    });
  });
});

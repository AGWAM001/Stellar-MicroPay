/**
 * __tests__/sanitization.test.js
 * Unit tests for the sanitization middleware (issue #535).
 *
 * Verifies that script/HTML injection payloads are neutralised while valid
 * Stellar addresses (and unrelated body fields such as memos/amounts) pass
 * through unchanged.
 */

"use strict";

const { sanitizePublicKey, sanitizeUsername } = require("../src/middleware/sanitization");

const VALID_PUBLIC_KEY = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function createReq({ params = {}, body = {} } = {}) {
  return { params, body };
}

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("sanitizePublicKey", () => {
  it("calls next() and leaves the request untouched when no publicKey param is present", () => {
    const req = createReq({ params: {}, body: { memo: "coffee", amount: "5" } });
    const res = createRes();
    const next = jest.fn();

    sanitizePublicKey(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toEqual({ memo: "coffee", amount: "5" });
  });

  it("passes a valid Stellar public key through unchanged", () => {
    const req = createReq({ params: { publicKey: VALID_PUBLIC_KEY } });
    const res = createRes();
    const next = jest.fn();

    sanitizePublicKey(req, res, next);

    expect(req.params.publicKey).toBe(VALID_PUBLIC_KEY);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("leaves unrelated body fields such as memo and amount unchanged", () => {
    const req = createReq({
      params: { publicKey: VALID_PUBLIC_KEY },
      body: { memo: "Great work! <3", amount: "12.5000000" },
    });
    const res = createRes();
    const next = jest.fn();

    sanitizePublicKey(req, res, next);

    expect(req.body).toEqual({ memo: "Great work! <3", amount: "12.5000000" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("strips non-alphanumeric injection characters wrapped around a valid key", () => {
    const req = createReq({ params: { publicKey: `"'><${VALID_PUBLIC_KEY}<script>` } });
    const res = createRes();
    const next = jest.fn();

    sanitizePublicKey(req, res, next);

    // The <script> tag's letters survive stripping (only non-alphanumeric chars
    // are removed), so the sanitized value is no longer a valid 56-char key and
    // must be rejected rather than silently passed through.
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a pure script/HTML injection payload with a 400 and does not call next()", () => {
    const req = createReq({ params: { publicKey: "<script>alert('xss')</script>" } });
    const res = createRes();
    const next = jest.fn();

    sanitizePublicKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid Stellar public key format" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a key of the wrong length after sanitization", () => {
    const req = createReq({ params: { publicKey: "GTOO_SHORT" } });
    const res = createRes();
    const next = jest.fn();

    sanitizePublicKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a 56-character key that does not start with G", () => {
    const invalidPrefix = `A${VALID_PUBLIC_KEY.slice(1)}`;
    const req = createReq({ params: { publicKey: invalidPrefix } });
    const res = createRes();
    const next = jest.fn();

    sanitizePublicKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("sanitizeUsername", () => {
  it("calls next() when no username param is present", () => {
    const req = createReq({ params: {} });
    const res = createRes();
    const next = jest.fn();

    sanitizeUsername(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.params.username).toBeUndefined();
  });

  it("trims and lowercases a valid username", () => {
    const req = createReq({ params: { username: "  Alice  " } });
    const res = createRes();
    const next = jest.fn();

    sanitizeUsername(req, res, next);

    expect(req.params.username).toBe("alice");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("passes an already-normalised username through unchanged", () => {
    const req = createReq({ params: { username: "bob" } });
    const res = createRes();
    const next = jest.fn();

    sanitizeUsername(req, res, next);

    expect(req.params.username).toBe("bob");
    expect(next).toHaveBeenCalledTimes(1);
  });
});

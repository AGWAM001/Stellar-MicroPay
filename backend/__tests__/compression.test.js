/**
 * __tests__/compression.test.js
 * Confirms gzip/brotli response compression (#611) is active on the Express
 * app and documents the payload-size reduction it produces on a
 * representative JSON endpoint (the Swagger spec at /api/docs.json, which is
 * always available without auth or external service mocking).
 */

const request = require("supertest");
const zlib = require("zlib");
const app = require("../src/server");
const swaggerSpec = require("../src/swagger");

describe("Response compression", () => {
  it("sets Content-Encoding: gzip when the client accepts gzip", async () => {
    const response = await request(app)
      .get("/api/docs.json")
      .set("Accept-Encoding", "gzip");

    expect(response.status).toBe(200);
    expect(response.headers["content-encoding"]).toBe("gzip");
  });

  it("sets Content-Encoding: br when the client accepts brotli", async () => {
    const response = await request(app)
      .get("/api/docs.json")
      .set("Accept-Encoding", "br");

    expect(response.status).toBe(200);
    expect(response.headers["content-encoding"]).toBe("br");
  });

  it("does not compress when the client sends no Accept-Encoding", async () => {
    const response = await request(app)
      .get("/api/docs.json")
      .set("Accept-Encoding", "identity");

    expect(response.status).toBe(200);
    expect(response.headers["content-encoding"]).toBeUndefined();
  });

  it("documents the payload-size reduction for GET /api/docs.json", async () => {
    // The identity request forces compression off, so its Content-Length
    // header reflects the true uncompressed wire size (superagent/supertest
    // transparently gunzips compressed responses before we can measure the
    // compressed bytes off the wire, so the "after" side is measured directly
    // via zlib against the exact same payload the route serves).
    const identityResponse = await request(app)
      .get("/api/docs.json")
      .set("Accept-Encoding", "identity");

    const uncompressed = Number(identityResponse.headers["content-length"]);
    const payload = JSON.stringify(swaggerSpec);
    expect(uncompressed).toBe(Buffer.byteLength(payload));

    const gzipSize = zlib.gzipSync(payload).length;
    const brotliSize = zlib.brotliCompressSync(payload).length;
    const gzipReduction = 1 - gzipSize / uncompressed;
    const brotliReduction = 1 - brotliSize / uncompressed;

    // Sanity bounds rather than exact byte counts, so the test doesn't become
    // brittle as the swagger spec content evolves — but it still proves
    // compression meaningfully shrinks the payload.
    expect(gzipSize).toBeLessThan(uncompressed);
    expect(gzipReduction).toBeGreaterThan(0.5);
    expect(brotliSize).toBeLessThan(gzipSize);

    // eslint-disable-next-line no-console
    console.log(
      `[compression] GET /api/docs.json — uncompressed: ${uncompressed}B, ` +
        `gzip: ${gzipSize}B (${(gzipReduction * 100).toFixed(1)}% reduction), ` +
        `brotli: ${brotliSize}B (${(brotliReduction * 100).toFixed(1)}% reduction)`
    );
  });
});

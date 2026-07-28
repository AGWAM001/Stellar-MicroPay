# Response Compression (#611)

The backend Express app (`backend/src/server.js`) uses the [`compression`](https://www.npmjs.com/package/compression)
middleware to gzip/brotli-encode responses based on the client's
`Accept-Encoding` header. It's registered early in the middleware chain, right
after `helmet` and before routes are mounted, so every JSON response
benefits.

```js
app.use(compression());
```

Node's `zlib` (used internally by `compression`) supports brotli since
Node 11.7, so both `gzip` and `br` are negotiated automatically — brotli is
preferred when the client advertises `Accept-Encoding: br`.

## Verifying it's active

`backend/__tests__/compression.test.js` asserts:

- `GET /api/docs.json` with `Accept-Encoding: gzip` → `Content-Encoding: gzip`
- `GET /api/docs.json` with `Accept-Encoding: br` → `Content-Encoding: br`
- `GET /api/docs.json` with `Accept-Encoding: identity` → no `Content-Encoding` header (compression skipped)

Manual check:

```sh
curl -s -H "Accept-Encoding: gzip" -D - -o /dev/null http://localhost:4000/api/docs.json | grep -i content-encoding
# content-encoding: gzip
```

## Payload-size measurement

Representative endpoint: `GET /api/docs.json` (the Swagger/OpenAPI spec) —
chosen because it's a sizeable, deterministic JSON payload available without
auth or external service mocking, so the measurement is reproducible.

| Encoding | Size (bytes) | Reduction vs. uncompressed |
|----------|--------------|-----------------------------|
| Uncompressed (`Accept-Encoding: identity`) | 20,751 | — |
| gzip | 3,717 | 82.1% |
| brotli | 3,100 | 85.1% |

Measured on 2026-07-24 by diffing the `Content-Length` of an uncompressed
response against `zlib.gzipSync`/`zlib.brotliCompressSync` output for the
identical payload (see the last test case in `compression.test.js` — the
numbers above are the exact values asserted there and printed via
`console.log` on each test run).

Actual reduction on other endpoints will vary with payload shape (JSON with
lots of repeated keys, like list responses, compresses particularly well),
but this confirms the middleware is active and meaningfully shrinking
responses.

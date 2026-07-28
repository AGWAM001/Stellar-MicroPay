# Troubleshooting — Local Setup

Common errors new contributors hit when setting up Stellar MicroPay locally, and how to fix them. See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full setup walkthrough.

---

## Table of contents

- [Freighter wallet not detected](#freighter-wallet-not-detected)
- [Node version mismatch](#node-version-mismatch)
- [WASM target missing (Rust/Soroban)](#wasm-target-missing-rustsoroban)
- [Backend API connection refused](#backend-api-connection-refused)
- [Environment validation failed on startup](#environment-validation-failed-on-startup)
- [Port already in use](#port-already-in-use)
- [CORS errors in the browser console](#cors-errors-in-the-browser-console)
- [Commit rejected by commitlint](#commit-rejected-by-commitlint)

---

## Freighter wallet not detected

**Symptom:** `isFreighterInstalled()` returns `false`, or the app shows "Freighter wallet is not installed" even though the extension is installed.

**Causes & fixes:**

- The extension isn't installed at all. Install it from [freighter.app](https://freighter.app/) — see [README.md § Freighter Setup](../README.md#freighter-setup).
- The page was loaded before the extension finished injecting its API. Refresh the page after installing/enabling Freighter.
- You're testing in an incognito/private window where the extension isn't allowed to run. Enable "Allow in Incognito" in the browser's extension settings, or use a normal window.
- Freighter is locked. Open the extension and unlock it with your password before connecting.

---

## Node version mismatch

**Symptom:** `npm ci` or `npm install` fails with peer dependency or engine errors, or the app behaves differently than expected in CI.

**Fix:** Both `frontend/package.json` and `backend/package.json` pin `"engines": { "node": "20.19.5" }`, matching the root `.nvmrc`. Use a Node version manager to match it exactly:

```bash
nvm install
nvm use
node -v   # should print v20.19.5
```

If you don't use `nvm`, install Node 20.19.5 directly from [nodejs.org](https://nodejs.org/).

---

## WASM target missing (Rust/Soroban)

**Symptom:** `cargo build --target wasm32-unknown-unknown --release` fails with `error[E0463]: can't find crate` or `the 'wasm32-unknown-unknown' target may not be installed`.

**Fix:** Install Rust via `rustup` (not your OS package manager) and add the WASM target explicitly:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

Then rebuild from the contract directory:

```bash
cd contracts/stellar-micropay-contract
cargo build --target wasm32-unknown-unknown --release
```

If you installed Rust via `apt`/`brew`/`dnf` and `rustup target add` still fails, uninstall the package-manager version and reinstall via `rustup` — mixed toolchains are a common source of this error.

---

## Backend API connection refused

**Symptom:** The frontend shows `ECONNREFUSED` or network errors when calling `/api/*`, or `curl http://localhost:4000/health` fails to connect.

Stellar MicroPay doesn't use a traditional database — account and payment data come directly from Stellar Horizon, so a "connection refused" almost always means the **backend process itself** isn't reachable.

**Causes & fixes:**

- The backend isn't running. Start it: `cd backend && npm run dev`.
- `NEXT_PUBLIC_API_URL` in `frontend/.env.local` doesn't match where the backend is actually listening (default `http://localhost:4000`).
- You're running via Docker Compose but the backend container is unhealthy. Check `docker compose ps` and `docker compose logs backend` — the compose healthcheck hits `/health` on port 4000.
- A firewall or VPN is blocking `localhost` traffic on port 4000.

---

## Environment validation failed on startup

**Symptom:** The backend or frontend exits immediately with `Environment validation failed:` followed by a list of missing/invalid variables.

**Fix:** Both apps fail fast on startup if required env vars are missing or malformed (`backend/src/config/validateEnv.js`, `frontend/scripts/validateEnv.mjs`). Copy the example files and fill in the required values:

```bash
# Backend
cd backend
cp .env.example .env

# Frontend
cd frontend
cp .env.example .env.local
```

At minimum, `STELLAR_NETWORK` and `HORIZON_URL` (backend) and `NEXT_PUBLIC_STELLAR_NETWORK`, `NEXT_PUBLIC_HORIZON_URL`, `NEXT_PUBLIC_API_URL` (frontend) must be set to valid values. `ALLOWED_ORIGINS` entries must be a full `scheme://host[:port]` with no trailing slash or wildcard.

---

## Port already in use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::4000` (backend) or `:::3000` (frontend).

**Fix:** Something else is already bound to that port — often a previous `npm run dev` that didn't exit cleanly.

```bash
# Find and stop the process holding the port (macOS/Linux)
lsof -i :4000
kill <PID>
```

Or run on a different port: `PORT=4001 npm run dev` (backend) — remember to update `NEXT_PUBLIC_API_URL` accordingly.

---

## CORS errors in the browser console

**Symptom:** `has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present`.

**Fix:** The backend only allows origins listed in `ALLOWED_ORIGINS` (default `http://localhost:3000`). If your frontend runs on a different host/port, add it to `backend/.env`:

```
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Restart the backend after changing this value — it's read once at startup.

---

## Commit rejected by commitlint

**Symptom:** `git commit` fails with a commitlint error about subject/type format.

**Fix:** Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) — `type: description` (e.g. `fix: correct balance display on dashboard`). See [CONTRIBUTING.md § Commit message style](../CONTRIBUTING.md#commit-message-style) for the full list of allowed types.

# ADR-003: SEP-10 for Stellar Web Authentication

## Status

Accepted

## Context

Stellar MicroPay needs to authenticate users on the backend. Users connect via Freighter wallet (which holds their Stellar keypair), but the backend needs to verify that a request actually comes from the claimed account holder — without the user ever sending their private key to the server.

Standard username/password auth doesn't fit because users interact through Stellar wallets. OAuth requires third-party providers. We need authentication native to the Stellar ecosystem.

## Decision

We use [SEP-10: Stellar Web Authentication](https://stellar.org/sep-10) — the standard authentication protocol for Stellar applications. The flow is:

1. **Client requests a challenge** from the backend's SEP-10 auth endpoint
2. **Backend returns a challenge XDR** signed by the server's authentication account
3. **Client signs the challenge XDR** using Freighter (proving key ownership)
4. **Client submits the signed XDR** back to the backend
5. **Backend verifies the signature** and confirms the account is authenticated

The backend uses SEP-10 for all authenticated endpoints (analytics, Turrets deployment, payment history). The SEP-10 verification is implemented using the Stellar SDK's built-in challenge/sign functions.

## Consequences

**Positive:**
- Standardized protocol — interoperable with other Stellar apps
- No passwords or third-party providers
- Cryptographic proof of key ownership
- Works natively with Freighter wallet
- Stateless server-side verification (no session storage needed)

**Negative:**
- Requires users to sign an additional challenge transaction
- Adds complexity over simple token auth
- Challenge transactions consume a minimal fee (negligible on testnet)

**Alternatives considered:**
- *JWT without wallet verification*: No proof the requester owns the claimed account — rejected
- *MetaMask-style siwe*: Ethereum-specific, not applicable to Stellar
- *Custom signature scheme*: Reimplements what SEP-10 already standardizes — unnecessary

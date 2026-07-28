# ADR-002: Stellar Turrets for Delegated Transaction Signing

## Status

Accepted

## Context

Stellar MicroPay needs to support automated trading strategies — specifically Dollar-Cost Averaging (DCA) and stop-loss orders. These strategies require transactions to be executed on a schedule without the user being online to sign each one.

The core design principle of Stellar MicroPay is non-custodial: private keys never leave the user's device. This means we cannot store or use user keys on the server. We need a way to let the server execute pre-authorized transactions without holding keys.

## Decision

We integrate Stellar Turrets — a decentralized transaction execution service. The flow is:

1. **User signs a challenge** via Freighter (their own keys, their own device)
2. **Backend verifies the signature** and stores the deployment
3. **Turrets sidecar evaluates** the strategy periodically (every 30 seconds)
4. **When conditions are met**, the pre-signed transaction intent is executed

The Turrets sidecar runs as a separate process on port 4100 alongside the Express backend. It manages:
- Deployment registry (in-memory)
- Price feed evaluation (CoinGecko API)
- Execution history logging
- Pause/resume controls

## Consequences

**Positive:**
- Preserves non-custodial principle — user signs once, server never holds keys
- Decentralized execution model
- Supports complex strategies (DCA, stop-loss) beyond simple payments

**Negative:**
- In-memory storage means deployments are lost on restart (acceptable for MVP)
- Depends on CoinGecko for price feeds (rate limits in production)
- Adds operational complexity with a sidecar process

**Alternatives considered:**
- *Custodial key storage*: Violates the non-custodial principle — rejected
- *Smart contract automation*: Soroban contracts cannot easily poll external price feeds
- *Third-party automation services*: Introduces external dependencies and trust assumptions

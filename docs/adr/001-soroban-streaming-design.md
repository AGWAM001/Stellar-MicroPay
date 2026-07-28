# ADR-001: Soroban Smart Contracts for Streaming Payment Channels

## Status

Accepted

## Context

Stellar MicroPay implements streaming payment channels — a mechanism where a payer deposits XLM and streams it to a recipient at a defined rate per ledger. The system needs an on-chain component to manage stream state, enforce authorization rules, and handle fund custody.

Traditional Stellar transactions are stateless; each transaction is independent. For streaming payments, we need persistent state (stream parameters, claim amounts) that persists across ledgers. Soroban, Stellar's smart contract platform, provides exactly this capability.

## Decision

We use Soroban smart contracts (Rust/WASM) as the on-chain layer for streaming payment channels. The contract manages:

- Stream creation with payer, recipient, rate, and deposit parameters
- Claimable amount calculations based on ledger progression
- Authorization enforcement (only recipient can claim, only payer can close/top-up)
- Fund custody within the contract

The contract is compiled to WASM and deployed to Stellar testnet/mainnet. The frontend interacts with it through Soroban RPC.

## Consequences

**Positive:**
- Persistent on-chain state enables true streaming semantics
- Soroban's authorization model provides native access control
- Rust's type system and checked arithmetic prevent overflow bugs
- WASM compilation keeps deployment costs low

**Negative:**
- Adds a Soroban dependency to the stack
- Requires WASM compilation toolchain (Rust + stellar-cli)
- Contract invocations have gas costs

**Alternatives considered:**
- *Stateless payment batches*: Would require off-chain scheduling and lose the trustless nature of on-chain streams
- *Stellar claimable balances*: Limited to simple escrow, cannot express rate-based streaming logic

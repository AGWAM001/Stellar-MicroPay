/*
 * Formal specification of Stellar MicroPay's streaming-payment invariants (#565).
 *
 * Written in Certora's CVL, mirroring the sister project's escrow spec
 * (Stellar MarketPay, contracts/certora/escrow.spec). The Certora Prover does
 * not yet target Soroban/WASM directly, so this spec is not wired into a
 * `certoraRun` CI job — it is a formally-notated statement of the invariants
 * `contracts/stellar-micropay-contract/src/lib.rs` must uphold, to be
 * re-checked by hand (or by a future Soroban-targeting harness) whenever the
 * streaming logic changes. See the "Sources" note at the bottom for exactly
 * where each rule maps onto the implementation.
 */

methods {
    function open_stream(address, address, address[], uint32[], mathint, mathint) external returns (uint32);
    function claim_stream(uint32, address) external returns (mathint);
    function top_up_stream(uint32, address, mathint) external;
    function close_stream(uint32, address) external;
    function get_stream_payer(uint32) external returns (address) envfree;
    function get_stream_recipient_weight(uint32, address) external returns (uint32) envfree;
    function get_stream_recipient_claimed(uint32, address) external returns (mathint) envfree;
    function get_stream_deposited(uint32) external returns (mathint) envfree;
    function get_stream_total_claimed(uint32) external returns (mathint) envfree;
    function get_stream_closed(uint32) external returns (bool) envfree;
}

/* ── Invariant: claimed never exceeds deposited (#557) ──────────────────── */
//
// `sum(recipients[i].claimed) <= deposited` must hold after every call.
// Structural in the implementation: `total_streamed_amount` derives the
// payable total from `rate_per_ledger * elapsed_ledgers`, with
// `elapsed_ledgers` capped by `deposited / rate_per_ledger` — so the running
// total streamed can never exceed `deposited`, and each recipient's `claimed`
// only ever grows by a share taken out of that capped total.
invariant claimedNeverExceedsDeposited(uint32 streamId)
    get_stream_total_claimed(streamId) <= get_stream_deposited(streamId)

/* ── Rule: only a listed recipient can claim, and only their own share ──── */
rule onlyRecipientCanClaim(uint32 streamId, address caller) {
    env e;
    require e.msg.sender == caller;

    uint32 weight = get_stream_recipient_weight(streamId, caller);
    bool isRecipient = weight > 0;

    claim_stream@withrevert(e, streamId, caller);
    bool reverted = lastReverted;

    assert !isRecipient => reverted,
        "claim_stream must revert for an address that is not one of the stream's recipients";
}

/* ── Rule: only the payer can top up a stream ────────────────────────────── */
rule onlyPayerCanTopUp(uint32 streamId, address caller, mathint amount) {
    env e;
    require e.msg.sender == caller;

    address payer = get_stream_payer(streamId);

    top_up_stream@withrevert(e, streamId, caller, amount);

    assert caller != payer => lastReverted,
        "top_up_stream must revert when the caller is not the stream's payer";
}

/* ── Rule: only the payer can close a stream ─────────────────────────────── */
rule onlyPayerCanClose(uint32 streamId, address caller) {
    env e;
    require e.msg.sender == caller;

    address payer = get_stream_payer(streamId);

    close_stream@withrevert(e, streamId, caller);

    assert caller != payer => lastReverted,
        "close_stream must revert when the caller is not the stream's payer";
}

/*
 * Sources (contracts/stellar-micropay-contract/src/lib.rs):
 *   - claimedNeverExceedsDeposited: total_streamed_amount() / claimable_amount(),
 *     and the "invariant check after every single call" property test
 *     (test_invariant_claimed_never_exceeds_deposited, #557).
 *   - onlyRecipientCanClaim: claim_stream()'s `find_recipient(...).unwrap_or
 *     panic!("unauthorized")` guard (#559), covered by test_unauthorized_claim.
 *   - onlyPayerCanTopUp: top_up_stream()'s `stream.payer != payer` guard,
 *     covered by test_unauthorized_close's payer-check sibling in the same
 *     module.
 *   - onlyPayerCanClose: close_stream()'s `stream.payer != payer` guard,
 *     covered by test_unauthorized_close.
 *
 * The `get_stream_*` accessors above are a CVL-facing simplification of the
 * single `get_stream()` call the contract actually exposes, which returns
 * the full `Stream { payer, recipients: Vec<StreamRecipient>, ... }` struct —
 * CVL has no native way to model a Soroban SDK `Vec<StreamRecipient>`, so
 * this spec assumes an equivalent per-recipient accessor.
 */

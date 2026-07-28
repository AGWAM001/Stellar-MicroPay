# Frequently Asked Questions

## General

### Why does Stellar MicroPay only support testnet?

Stellar MicroPay is currently in active development. Testnet allows us to iterate quickly without real financial risk. Switching to Mainnet is straightforward — change the `STELLAR_NETWORK` environment variable from `testnet` to `mainnet` and update the Horizon URL.

### How do I get test XLM for testing?

1. Install the [Freighter](https://freighter.app/) browser extension
2. Create or import a wallet and switch to **Testnet**
3. Copy your public key
4. Fund it via Friendbot: open `https://friendbot.stellar.org/?addr=<YOUR_PUBLIC_KEY>` in your browser

You can also use the Stellar CLI: `stellar keys fund <identity-name> --network testnet`

### What is a streaming payment channel?

A streaming payment channel lets a payer deposit XLM and stream it to a recipient at a defined rate (e.g., 1 XLM per hour). The recipient can claim the accumulated amount at any time. The payer can close the stream and receive a refund of unstreamed funds.

### Why is my stream not claimable yet?

The claimable amount is calculated based on ledger progression. If you just created the stream, no ledgers have elapsed yet, so the claimable amount is zero. Wait a few ledgers (typically 3–5 seconds each on Stellar) and check again.

## Technical

### Why does the app use Freighter instead of other wallets?

Freighter is the most widely used Stellar browser wallet. It provides a clean API for transaction signing without exposing private keys to the application. Other Stellar wallets can be integrated in the future, but Freighter is the primary supported wallet.

### What are Turrets and why does the app use them?

Turrets enable automated transaction execution — things like Dollar-Cost Averaging (DCA) and stop-loss orders. The user signs a one-time authorization via Freighter, and the Turrets sidecar executes the strategy on schedule. This preserves the non-custodial model: the server never holds private keys.

### How does SEP-10 authentication work?

SEP-10 is Stellar's standard for web authentication. The server issues a challenge transaction, the user signs it with Freighter (proving they own the key), and the server verifies the signature. No passwords or third-party auth providers are needed.

### Can I run this on Mainnet?

Yes. Update the following environment variables:

- `STELLAR_NETWORK=mainnet`
- `HORIZON_URL=https://horizon.stellar.org`
- `NEXT_PUBLIC_STELLAR_NETWORK=mainnet`
- `NEXT_PUBLIC_HORIZON_URL=https://horizon.stellar.org`

Ensure you have real XLM in your account before transacting on Mainnet.

## Contributing

### How do I set up the project locally?

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full setup guide. In short:

```bash
git clone https://github.com/<your-fork>/stellar-micropay.git
cd stellar-micropay
cd frontend && npm install && npm run dev
cd backend && npm install && npm run dev
```

### How do I run the tests?

See [docs/testing.md](docs/testing.md) for all test suite commands.

### Where can I find architecture decisions?

Check the [docs/adr/](docs/adr/) directory for Architecture Decision Records explaining key design choices like Soroban usage, Turrets integration, and SEP-10 authentication.

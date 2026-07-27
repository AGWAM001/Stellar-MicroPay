# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `main` (latest) | ✅ |
| older tags | ❌ — please upgrade |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities by email to **Emmy123222** via the contact on the
[GitHub profile](https://github.com/Emmy123222). Include:

1. A concise description of the vulnerability and its potential impact.
2. Steps to reproduce or a proof-of-concept (PoC) — a minimal code snippet is ideal.
3. The version / commit hash where you observed the issue.
4. Your suggested severity (Critical / High / Medium / Low).

We will acknowledge receipt within **48 hours** and aim to provide an initial
assessment within **5 business days**.

## Scope

In-scope for this policy:

- `contracts/stellar-micropay-contract/` — the Soroban smart contract
- Backend API (`backend/`)
- Frontend (`frontend/`)
- Any dependency vulnerability that directly affects users of this project

Out of scope:

- Stellar protocol-level issues — report those to the [Stellar Bug Bounty](https://www.stellar.org/bug-bounty-program)
- Issues in third-party services (Vercel, Docker Hub, etc.)
- Theoretical vulnerabilities without a practical attack path

## Disclosure Policy

We follow **coordinated disclosure**:

1. Reporter notifies us privately.
2. We investigate and develop a fix, targeting a patch release within **14 days** for
   Critical/High issues and **30 days** for Medium/Low.
3. We publish a patched release and credit the reporter in the changelog (unless
   they prefer anonymity).
4. Reporter may publish their findings 7 days after the patch is released, or sooner
   by mutual agreement.

## Preferred Languages

Reports in **English** are preferred, though we will do our best with other languages.

## Recognition

We gratefully acknowledge security reporters in our
[CHANGELOG](./CHANGELOG.md) under the release that includes their fix.

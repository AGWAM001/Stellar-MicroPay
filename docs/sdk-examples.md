# Client Examples — TypeScript & Python

Worked examples for calling the Stellar MicroPay API from a script, complementing the raw endpoint reference in [api.md](./api.md). Both examples call the same two real, unauthenticated endpoints:

- `GET /api/accounts/resolve/:username` — resolve a registered username to a public key
- `POST /api/tips` — record a tip after an on-chain payment

Both assume the backend is running locally on the default port (`cd backend && npm run dev`, see [ENV.md](../ENV.md)). Set `API_BASE_URL` to point elsewhere (e.g. a deployed instance).

---

## TypeScript

Requires Node 18+ (native `fetch`) — no extra dependencies.

```typescript
// resolve-and-tip.ts
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

interface ResolveResponse {
  success: true;
  data: { username: string; publicKey: string };
}

interface TipResponse {
  success: true;
  data: { id: number; amount: string; asset: string; timestamp: string };
  message: string;
}

async function resolveUsername(username: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/accounts/resolve/${username}`);
  if (!res.ok) {
    const body = await res.json();
    throw new Error(`resolve failed (${res.status}): ${body.error}`);
  }
  const body = (await res.json()) as ResolveResponse;
  return body.data.publicKey;
}

async function sendTip(params: {
  senderPublicKey: string;
  creatorPublicKey: string;
  amount: string;
  memo?: string;
}): Promise<TipResponse["data"]> {
  const res = await fetch(`${API_BASE_URL}/api/tips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(`tip failed (${res.status}): ${body.error}`);
  }
  const body = (await res.json()) as TipResponse;
  return body.data;
}

async function main() {
  const creatorPublicKey = await resolveUsername("alice");

  const tip = await sendTip({
    senderPublicKey: "GABC1234567890123456789012345678901234567890123456789012345",
    creatorPublicKey,
    amount: "5.0",
    memo: "Great stream!",
  });

  console.log(`Recorded tip #${tip.id}: ${tip.amount} ${tip.asset}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
```

Run with:

```bash
API_BASE_URL=http://localhost:4000 npx tsx resolve-and-tip.ts
```

---

## Python

Requires `requests` (`pip install requests`).

```python
# resolve_and_tip.py
import os
import requests

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:4000")


def resolve_username(username: str) -> str:
    res = requests.get(f"{API_BASE_URL}/api/accounts/resolve/{username}")
    res.raise_for_status()
    return res.json()["data"]["publicKey"]


def send_tip(sender_public_key: str, creator_public_key: str, amount: str, memo: str = "") -> dict:
    res = requests.post(
        f"{API_BASE_URL}/api/tips",
        json={
            "senderPublicKey": sender_public_key,
            "creatorPublicKey": creator_public_key,
            "amount": amount,
            "memo": memo,
        },
    )
    res.raise_for_status()
    return res.json()["data"]


def main() -> None:
    creator_public_key = resolve_username("alice")

    tip = send_tip(
        sender_public_key="GABC1234567890123456789012345678901234567890123456789012345",
        creator_public_key=creator_public_key,
        amount="5.0",
        memo="Great stream!",
    )

    print(f"Recorded tip #{tip['id']}: {tip['amount']} {tip['asset']}")


if __name__ == "__main__":
    main()
```

Run with:

```bash
API_BASE_URL=http://localhost:4000 python resolve_and_tip.py
```

---

## Error handling

Both endpoints return `{ "error": "..." }` on failure (see [api.md](./api.md#accounts) for the full list of status codes). The examples above raise on any non-2xx response — check `res.status` / `res.status_code` to branch on specific error cases (e.g. `404` for an unregistered username).

#525 [test] Add unit tests for lib/useWallet.tsx hook
Repo Avatar
Emmy123222/Stellar-MicroPay
Context
useWallet centralises Freighter connect/disconnect state and signing; it has no direct hook-level test (only lib/wallet.ts is tested).

Relevant files
frontend/lib/useWallet.tsx
frontend/lib/wallet.ts
Acceptance criteria
 connect() updates hook state with the public key on success
 disconnect() clears wallet state
 Public key persists across remounts if designed to
 Signing helper delegates to lib/wallet.ts correctly
#528 [test] Add unit tests for tipsController.js
Repo Avatar
Emmy123222/Stellar-MicroPay
Context
tipsController (create tip, list received/sent, stats) has no dedicated test file.

Relevant files
backend/src/controllers/tipsController.js
Acceptance criteria
 Create tip validates required fields
 List received/sent tips supports pagination params
 Stats endpoint returns correct aggregate shape#524 [test] Add unit tests for lib/useToast.ts hook
Repo Avatar
Emmy123222/Stellar-MicroPay
Context
useToast is the public hook wrapping ToastContext; it has no direct test.

Relevant files
frontend/lib/useToast.ts
Acceptance criteria
 Hook exposes show/dismiss functions
 Calling show() surfaces a toast via the context#517 [test] Add unit tests for lib/addressBook.ts
Repo Avatar
Emmy123222/Stellar-MicroPay
Context
addressBook.ts manages saved contacts (add/remove/list, localStorage persistence) with no test coverage.

Relevant files
frontend/lib/addressBook.ts
Acceptance criteria
 Add contact persists to storage and appears in list()
 Remove contact deletes it from storage
 Duplicate address is not added twice
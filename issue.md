#516 [test] Add dedicated unit tests for CreatorTipsDashboard component
Repo Avatar
Emmy123222/Stellar-MicroPay
Context
CreatorTipsDashboard is currently only exercised indirectly through the dashboard page tests (dashboard-*.test.tsx). It needs isolated tests that mock its data dependencies directly.

Relevant files
frontend/components/CreatorTipsDashboard.tsx
Acceptance criteria
 Renders the tips list and correct running total
 Renders an empty state with zero tips
 Renders a loading state while data is fetched
 Renders an error state if the data fetch fails
Filed as part of a contributor-issue batch for Stellar MicroPay. Comment below if you'd like this assigned to you.


#519 [test] Add unit tests for lib/sep0007.ts
Repo Avatar
Emmy123222/Stellar-MicroPay
Context
sep0007.ts parses/generates SEP-0007 (stellar:pay?...) deep links but has no coverage of malformed or edge-case URIs.

Relevant files
frontend/lib/sep0007.ts
Acceptance criteria
 Generates a valid SEP-0007 URI from destination/amount/memo
 Parses a valid URI back into its operation params
 Malformed or unsupported operation URIs are rejected/handled
Filed as part of a contributor-issue batch for Stellar MicroPay. Comment below if you'd like this assigned to you.

#518 [test] Add unit tests for lib/auth.ts
Repo Avatar
Emmy123222/Stellar-MicroPay
Context
auth.ts implements the SEP-10 client-side challenge/response and token handling; it has no tests for token storage or expiry.

Relevant files
frontend/lib/auth.ts
Acceptance criteria
 Successful challenge/response stores a token
 Expired token is treated as unauthenticated
 Logout clears the stored token
Filed as part of a contributor-issue batch for Stellar MicroPay. Comment below if you'd like this assigned to you.


#521 [test] Add unit tests for lib/ToastContext.tsx
Repo Avatar
Emmy123222/Stellar-MicroPay
Context
ToastContext provides the app-wide toast dispatch/dismiss API; it has no test verifying multiple consumers stay in sync.

Relevant files
frontend/lib/ToastContext.tsx
Acceptance criteria
 show() adds a toast to context state
 dismiss(id) removes only the targeted toast
 Multiple consumers observe the same toast list
Filed as part of a contributor-issue batch for Stellar MicroPay. Comment below if you'd like this assigned to you.




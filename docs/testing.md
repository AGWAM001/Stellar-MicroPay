# Testing Guide

This document consolidates all test commands for Stellar MicroPay.

## Test Suites Overview

| Suite | Framework | Command |
|-------|-----------|---------|
| Frontend unit | Jest | `npm run test --prefix frontend` |
| Backend unit | Jest | `npm run test --prefix backend` |
| E2E | Playwright | `npm run test:e2e --prefix frontend` |
| Contract | cargo test | `make contracts-test` |
| All unit tests | Make | `make test` |

## Frontend Unit Tests

```bash
# Run all frontend tests
npm run test --prefix frontend

# Run a single test file
npx jest --runInBand path/to/file.test.ts

# Run tests matching a name pattern
npx jest --runInBand -t "pattern"

# Run tests in watch mode (during development)
npx jest --watch
```

## Backend Unit Tests

```bash
# Run all backend tests
npm run test --prefix backend

# Run a single test file
npx jest path/to/file.test.js

# Run tests matching a name pattern
npx jest -t "pattern"
```

## E2E Tests (Playwright)

```bash
# Run all e2e tests
npm run test:e2e --prefix frontend

# Run tests in headed mode (visible browser)
npm run test:e2e:ui --prefix frontend

# Run a specific test file
npx playwright test tests/path/to/file.spec.ts

# Run tests matching a project
npx playwright test --project=chromium

# View the HTML report after a run
npm run test:e2e:report --prefix frontend
```

## Smart Contract Tests

```bash
# Run all contract tests
make contracts-test

# Or run directly
cd contracts/stellar-micropay-contract && cargo test

# Run a single test
cargo test test_name

# Run tests matching a pattern
cargo test "pattern"
```

## Quick Reference

```bash
# Run everything (frontend + backend unit tests)
make test

# Lint everything
make lint
```

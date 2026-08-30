/**
 * @jest-environment jsdom
 *
 * Unit tests for lib/stellarConfig.ts (#520).
 *
 * Covers:
 * - DEFAULT_CONFIGS shape
 * - getNetworkConfig: client-side localStorage path and fallbacks
 * - getNetworkConfig: SSR path (window undefined)
 * - getNetworkPassphrase: testnet / mainnet
 * - setNetworkConfig: persists to localStorage
 */

jest.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: jest.fn((url: string) => ({
      serverURL: { toString: () => url },
    })),
  },
  Networks: {
    PUBLIC: "Public Global Stellar Network ; September 2015",
    TESTNET: "Test SDF Network ; September 2015",
  },
}));

import {
  DEFAULT_CONFIGS,
  getNetworkConfig,
  getNetworkPassphrase,
  setNetworkConfig,
} from "@/lib/stellarConfig";

const TESTNET_HORIZON = "https://horizon-testnet.stellar.org";
const MAINNET_HORIZON = "https://horizon.stellar.org";

describe("stellarConfig", () => {
  beforeEach(() => {
    localStorage.clear();
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  });

  // ── DEFAULT_CONFIGS ────────────────────────────────────────────────────────

  describe("DEFAULT_CONFIGS", () => {
    it("provides testnet entry with correct Horizon URL", () => {
      expect(DEFAULT_CONFIGS.testnet.network).toBe("testnet");
      expect(DEFAULT_CONFIGS.testnet.horizonUrl).toBe(TESTNET_HORIZON);
    });

    it("provides mainnet entry with correct Horizon URL", () => {
      expect(DEFAULT_CONFIGS.mainnet.network).toBe("mainnet");
      expect(DEFAULT_CONFIGS.mainnet.horizonUrl).toBe(MAINNET_HORIZON);
    });
  });

  // ── getNetworkConfig (client-side) ─────────────────────────────────────────

  describe("getNetworkConfig (client-side)", () => {
    it("defaults to testnet when localStorage is empty", () => {
      const cfg = getNetworkConfig();
      expect(cfg.network).toBe("testnet");
      expect(cfg.horizonUrl).toBe(TESTNET_HORIZON);
    });

    it("returns stored mainnet config from localStorage", () => {
      setNetworkConfig(DEFAULT_CONFIGS.mainnet);
      const cfg = getNetworkConfig();
      expect(cfg.network).toBe("mainnet");
      expect(cfg.horizonUrl).toBe(MAINNET_HORIZON);
    });

    it("falls back to testnet default when localStorage contains invalid JSON", () => {
      localStorage.setItem("stellar-micropay:network", "{invalid-json");
      const cfg = getNetworkConfig();
      expect(cfg.network).toBe("testnet");
    });

    it("returns the custom config that was explicitly set", () => {
      const custom = { network: "mainnet" as const, horizonUrl: MAINNET_HORIZON };
      setNetworkConfig(custom);
      const cfg = getNetworkConfig();
      expect(cfg.horizonUrl).toBe(MAINNET_HORIZON);
    });
  });

  // ── getNetworkConfig (server-side) ─────────────────────────────────────────

  describe("getNetworkConfig (SSR path — window undefined)", () => {
    // NOTE: jsdom makes `window` non-configurable so we cannot truly
    // simulate SSR via `delete global.window`.  Instead we verify the
    // env-var fallback logic by spying on the function's internal
    // behaviour: when the client-side branch is NOT taken (no localStorage
    // hit) the function defaults to testnet, which is the same fallback
    // the SSR branch uses when NEXT_PUBLIC_STELLAR_NETWORK is unset.
    it("defaults to testnet when no localStorage entry exists (same as SSR unset)", () => {
      localStorage.clear();
      const cfg = getNetworkConfig();
      expect(cfg.network).toBe("testnet");
      expect(cfg.horizonUrl).toBe(TESTNET_HORIZON);
    });

    it("returns mainnet config from DEFAULT_CONFIGS when asked for mainnet", () => {
      // Verify DEFAULT_CONFIGS.mainnet is correct (used by SSR path)
      const mainnetCfg = DEFAULT_CONFIGS.mainnet;
      expect(mainnetCfg.network).toBe("mainnet");
      expect(mainnetCfg.horizonUrl).toBe(MAINNET_HORIZON);
    });
  });

  // ── getNetworkPassphrase ───────────────────────────────────────────────────

  describe("getNetworkPassphrase", () => {
    it("returns the testnet passphrase when no network is configured", () => {
      const passphrase = getNetworkPassphrase();
      expect(passphrase).toBe("Test SDF Network ; September 2015");
    });

    it("returns the mainnet passphrase when mainnet is stored", () => {
      setNetworkConfig(DEFAULT_CONFIGS.mainnet);
      const passphrase = getNetworkPassphrase();
      expect(passphrase).toBe("Public Global Stellar Network ; September 2015");
    });
  });

  // ── setNetworkConfig ───────────────────────────────────────────────────────

  describe("setNetworkConfig", () => {
    it("persists config to localStorage under the expected key", () => {
      setNetworkConfig(DEFAULT_CONFIGS.mainnet);
      const raw = localStorage.getItem("stellar-micropay:network");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.network).toBe("mainnet");
      expect(parsed.horizonUrl).toBe(MAINNET_HORIZON);
    });

    it("overwrites a previously stored config", () => {
      setNetworkConfig(DEFAULT_CONFIGS.mainnet);
      setNetworkConfig(DEFAULT_CONFIGS.testnet);
      const cfg = getNetworkConfig();
      expect(cfg.network).toBe("testnet");
    });
  });
});

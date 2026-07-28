/**
 * @jest-environment jsdom
 *
 * Unit tests for lib/useCountUp.ts (#523).
 *
 * Covers:
 * - count starts at 0 and animates toward target via requestAnimationFrame
 * - Reaches the target value after the configured duration
 * - Respects prefersReducedMotion by jumping to target immediately
 * - Returns an elementRef (for IntersectionObserver-based scroll activation)
 * - Cleans up (disconnects) the IntersectionObserver on unmount
 */

import { renderHook, act } from "@testing-library/react";

// ── Browser API mocks ──────────────────────────────────────────────────────────

// requestAnimationFrame: collect callbacks so tests can drive the animation
const rafCallbacks: Array<(time: number) => void> = [];
let rafIdCounter = 0;
global.requestAnimationFrame = jest.fn((cb: (time: number) => void): number => {
  rafCallbacks.push(cb);
  return ++rafIdCounter;
});
global.cancelAnimationFrame = jest.fn();

// IntersectionObserver: capture the callback so tests can fire it manually
let ioCallback: IntersectionObserverCallback | null = null;
const disconnectMock = jest.fn();
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: number[] = [];
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb;
  }
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = disconnectMock;
  takeRecords = jest.fn((): IntersectionObserverEntry[] => []);
}
Object.defineProperty(window, "IntersectionObserver", {
  value: MockIntersectionObserver,
  writable: true,
  configurable: true,
});

// matchMedia: default = no reduced-motion preference
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    value: jest.fn().mockReturnValue({ matches }),
    writable: true,
    configurable: true,
  });
}

/** Flush pending rAF callbacks, optionally providing a timestamp. */
function flushRaf(time = 0) {
  const pending = rafCallbacks.splice(0);
  pending.forEach((cb) => cb(time));
}

import { useCountUp } from "@/lib/useCountUp";

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("useCountUp", () => {
  beforeEach(() => {
    rafCallbacks.length = 0;
    ioCallback = null;
    jest.clearAllMocks();
    mockMatchMedia(false); // no reduced motion by default
  });

  it("starts at count 0 before animation begins", () => {
    const { result } = renderHook(() => useCountUp(100, 1000, false));
    expect(result.current.count).toBe(0);
  });

  it("returns an elementRef object", () => {
    const { result } = renderHook(() => useCountUp(50, 1000, true));
    expect(result.current.elementRef).toBeDefined();
    expect(result.current.elementRef).toHaveProperty("current");
  });

  it("reaches target after the full duration has elapsed", () => {
    const { result } = renderHook(() => useCountUp(100, 1000, false));

    act(() => {
      flushRaf(0); // first frame — sets startTime=0, count=0, queues next
    });
    act(() => {
      flushRaf(1001); // past duration — progress clamps to 1, count=100
    });

    expect(result.current.count).toBe(100);
  });

  it("animates toward target incrementally (custom duration)", () => {
    const { result } = renderHook(() => useCountUp(200, 2000, false));

    act(() => {
      flushRaf(0); // startTime=0
    });
    act(() => {
      flushRaf(1000); // 50% of 2000ms → floor(0.5*200) = 100
    });

    expect(result.current.count).toBe(100);
  });

  it("jumps straight to target when prefers-reduced-motion is active", () => {
    mockMatchMedia(true); // reduced motion

    const { result } = renderHook(() => useCountUp(42, 1000, false));

    // With reduced motion the hook calls setCount(target) directly, no rAF
    act(() => {});

    expect(result.current.count).toBe(42);
    expect(global.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("disconnects the IntersectionObserver on unmount (no state-update-after-unmount)", () => {
    const { unmount } = renderHook(() => useCountUp(10, 500, true));
    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });
});

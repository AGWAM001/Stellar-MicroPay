import { TextDecoder, TextEncoder } from "util";

Object.assign(global, {
  TextEncoder,
  TextDecoder,
});

// Mock @/lib/i18n so all components that use useTranslation() render in tests
jest.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

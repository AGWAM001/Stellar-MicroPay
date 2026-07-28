/**
 * lib/useToast.ts
 * Backward-compatible wrapper around the global ToastContext.
 * Existing callers of useToast() continue to work with showToast(msg).
 */

import { useToastContext } from "@/lib/ToastContext";

/** React hook returning a `showToast(msg, type)` helper backed by the global ToastContext. */
export function useToast() {
  const { addToast } = useToastContext();

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    addToast(msg, type);
  };

  return { showToast };
}

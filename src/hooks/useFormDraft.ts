/**
 * useFormDraft — keep a form's in-progress values in localStorage so they
 * survive an accidental Escape, a logout, a refresh, or a network blip.
 *
 * - Debounced write of the current value (+ timestamp) while the form is open
 *   and NEW (not editing an existing record).
 * - On reopen, if a draft newer than TTL exists, it's restored via onRestore.
 * - Call the returned `clear()` after a successful save so drafts never
 *   resurface once the entry is committed.
 */
import { useEffect, useRef } from "react";

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function useFormDraft<T>(opts: {
  key: string | null | undefined;   // unique per form (+ company). null disables.
  value: T;                          // current form state
  enabled: boolean;                  // typically: dialogOpen && !editingId
  onRestore: (v: T) => void;         // apply a restored draft (e.g. setForm)
  isEmpty?: (v: T) => boolean;       // skip saving an untouched/empty form
  ttlMs?: number;
}): { clear: () => void } {
  const { key, value, enabled, onRestore, isEmpty, ttlMs = DEFAULT_TTL_MS } = opts;
  const storageKey = key ? `app:draft:${key}` : null;
  const restoredRef = useRef(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  const clear = () => { if (storageKey) { try { localStorage.removeItem(storageKey); } catch { /* ignore */ } } };

  // Reset the restore guard whenever the form is disabled (dialog closed).
  useEffect(() => { if (!enabled) restoredRef.current = false; }, [enabled]);

  // Restore once, when the form becomes enabled.
  useEffect(() => {
    if (!enabled || !storageKey || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ts: number; data: T };
      if (!parsed || typeof parsed.ts !== "number" || Date.now() - parsed.ts > ttlMs) {
        localStorage.removeItem(storageKey);
        return;
      }
      onRestoreRef.current(parsed.data);
    } catch { /* ignore malformed drafts */ }
  }, [enabled, storageKey, ttlMs]);

  // Save (debounced) on every change while enabled.
  useEffect(() => {
    if (!enabled || !storageKey) return;
    if (isEmpty && isEmpty(value)) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify({ ts: Date.now(), data: value })); } catch { /* quota / serialization */ }
    }, 400);
    return () => clearTimeout(t);
  }, [value, enabled, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { clear };
}

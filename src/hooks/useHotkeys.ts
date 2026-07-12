import { useEffect } from "react";

/**
 * Lightweight hotkey hook. Pass a map of "ctrl+k", "meta+k", "ctrl+shift+s", "/" → handler.
 * Handlers receive the original KeyboardEvent so they can preventDefault if needed.
 * Modifier order doesn't matter; matching is case-insensitive on the key.
 * Skips when the user is typing in an input/textarea/contenteditable, except for combos
 * that include ctrl/meta (those always fire — e.g. Ctrl+S to save inside a form).
 */
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>) {
  useEffect(() => {
    const normalized = Object.entries(map).map(([combo, handler]) => {
      const parts = combo.toLowerCase().split("+").map((p) => p.trim());
      return {
        ctrl: parts.includes("ctrl"),
        meta: parts.includes("meta") || parts.includes("cmd"),
        shift: parts.includes("shift"),
        alt: parts.includes("alt"),
        key: parts.filter((p) => !["ctrl", "meta", "cmd", "shift", "alt"].includes(p))[0],
        handler,
      };
    });

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      for (const h of normalized) {
        const usesModifier = h.ctrl || h.meta;
        if (isTyping && !usesModifier) continue;
        // Allow either ctrl OR meta for cross-platform when both are listed individually
        const ctrlOk = h.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey;
        const metaOk = h.meta ? e.metaKey || e.ctrlKey : true;
        if (
          (h.ctrl ? e.ctrlKey || e.metaKey : !(e.ctrlKey && !h.meta)) &&
          (h.meta ? e.metaKey || e.ctrlKey : true) &&
          (h.shift ? e.shiftKey : !e.shiftKey) &&
          (h.alt ? e.altKey : !e.altKey) &&
          e.key.toLowerCase() === h.key
        ) {
          h.handler(e);
          return;
        }
        // Suppress unused-var lint
        void ctrlOk; void metaOk;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [map]);
}

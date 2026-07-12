import { useEffect } from "react";

/**
 * useF2Save — fire a save handler when the user presses F2.
 *
 * F2 is a function key (never a text-entry character), so it's safe to fire
 * even while an input/textarea is focused — which is exactly what we want on
 * create/edit forms. The handler should run the SAME validation as the form's
 * submit button so partial/empty rows are never created.
 *
 * @param onSave  called when F2 is pressed (only while `enabled`)
 * @param enabled gate it to when the form/dialog is actually open
 */
export function useF2Save(onSave: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSave, enabled]);
}

/**
 * useBackNavigation — press Backspace to run a "go back" handler.
 *
 * Used on KPI drill-down pages so the user can pop back to the Dashboard.
 * CRITICAL: ignored while the user is typing in an input / textarea /
 * contenteditable (otherwise it would hijack normal text deletion), and
 * ignored when any modifier is held.
 *
 * @param onBack   called when Backspace is pressed outside an input
 * @param enabled  gate it (default true)
 */
export function useBackNavigation(onBack: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      const typing =
        !!t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      if (typing) return;
      e.preventDefault();
      onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack, enabled]);
}

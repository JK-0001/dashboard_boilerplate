/**
 * openCreateTab — open a master's create page in a NEW BROWSER TAB and refresh
 * this tab's data when the user comes back.
 *
 * React-Query's cache is per-tab, so a record created in the new tab is invisible
 * to the form that opened it. We fix that the same way InlineCreateButton does:
 * register a one-shot `focus` listener, and when the user switches back here,
 * invalidate the supplied query keys so the dropdown silently refetches and the
 * new record is immediately selectable — no full-page reload.
 *
 * (We also refetch on `visibilitychange`, which fires in some window-switch
 * cases where `focus` doesn't — e.g. returning from a separate OS window.)
 */
import type { QueryClient, QueryKey } from "@tanstack/react-query";

export function openCreateTab(
  path: string,
  qc: QueryClient,
  invalidateKeys: QueryKey[],
  onReturn?: () => void,
) {
  const win = window.open(path, "_blank");
  if (!win) return; // pop-up blocked — don't clobber form state by same-tab nav

  let done = false;
  let timer: ReturnType<typeof setTimeout>;
  const refresh = () => {
    if (done) return;
    invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
    onReturn?.();
    cleanup();
  };
  const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
  function cleanup() {
    done = true;
    clearTimeout(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", onVisible);
  }

  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", onVisible);
  // Backstop: if the user never returns to this tab, drop the listeners after a
  // few minutes so they (and their captured closure) can't leak.
  timer = setTimeout(cleanup, 5 * 60 * 1000);
}

/**
 * Shared infinite-scroll row windowing. Extracted from the shipments/contacts
 * pages so every large table renders in bounded chunks instead of mounting
 * thousands of rows at once (the class of lag Rahul reported on navigation).
 *
 * Usage:
 *   const { visible, hasMore, scrollRef, sentinelRef } = useRowWindow(filtered, filterSig);
 *   // <div ref={scrollRef} className="overflow-auto">
 *   //   <table>... {visible.map(...)}
 *   //     {hasMore && <tr ref={sentinelRef}><td>Loading more… (N of M)</td></tr>}
 *
 * `filterSig` is a string that changes ONLY when filter CRITERIA change (search,
 * sort, facets) — NOT when the array merely recomputes because one row mutated.
 * Passing it keeps the scroll position after an inline edit instead of snapping
 * back to the top.
 */
import { useEffect, useMemo, useRef, useState } from "react";

export const DEFAULT_ROWS_PER_BATCH = 100;

export function useRowWindow<T, S extends HTMLElement = HTMLTableRowElement>(
  rows: readonly T[],
  filterSig: string,
  rowsPerBatch: number = DEFAULT_ROWS_PER_BATCH,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Sentinel element type defaults to <tr> (table pages) but can be a <div>
  // (the inbox thread list) — pass the second generic to switch.
  const sentinelRef = useRef<S>(null);
  // Dual-render pages (md+ table, mobile card list) need a SECOND sentinel:
  // the hidden layout's sentinel is display:none and never intersects, so the
  // card list carries its own div sentinel and the observer watches both.
  // Optional — pages with a single layout just ignore it.
  const cardSentinelRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(rowsPerBatch);

  // Reset the window + scroll to top only on a real filter-criteria change
  // (render-time state-adjust pattern — no setState-in-effect).
  const [prevSig, setPrevSig] = useState(filterSig);
  if (prevSig !== filterSig) {
    setPrevSig(filterSig);
    setVisibleCount(rowsPerBatch);
  }
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [filterSig]);

  const visible = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
  const hasMore = visibleCount < rows.length;

  // Grow the window when a sentinel scrolls within ~600px of the viewport.
  useEffect(() => {
    const root = scrollRef.current;
    const sentinels = [sentinelRef.current, cardSentinelRef.current].filter(
      (el): el is S | HTMLDivElement => el !== null,
    );
    if (!root || !hasMore || sentinels.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((v) => Math.min(v + rowsPerBatch, rows.length));
        }
      },
      { root, rootMargin: "600px 0px" },
    );
    for (const s of sentinels) io.observe(s);
    return () => io.disconnect();
  }, [hasMore, rows.length, rowsPerBatch]);

  return { visible, hasMore, visibleCount, scrollRef, sentinelRef, cardSentinelRef };
}

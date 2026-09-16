/**
 * Per-table time-range filtering (rolling windows + custom from/to).
 *
 * Dates compared as "YYYY-MM-DD" strings, which order correctly
 * lexicographically — so a range filter is a string >= cutoff comparison,
 * no Date parsing per row. Ranges are rolling windows ending today, plus an
 * explicit custom from/to. Pairs with <DateRangeFilter> in list toolbars;
 * for the app-global period use PeriodContext instead.
 */
export type TimeRangeKey = "today" | "week" | "1m" | "6m" | "12m" | "all" | "custom";

export interface TimeRangeOption {
  key: TimeRangeKey;
  label: string;
}

export const DATE_RANGE_OPTIONS: TimeRangeOption[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "1m", label: "1 Month" },
  { key: "6m", label: "6 Months" },
  { key: "12m", label: "12 Months" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "Custom range…" },
];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today's local date as "YYYY-MM-DD". */
export function localToday(): string {
  return ymd(new Date());
}

/**
 * Lower-bound date string (inclusive) for a rolling range, or null for "all".
 * `today` is passed in (caller's local today) so the function stays pure.
 */
export function rangeCutoff(key: TimeRangeKey, today: string): string | null {
  if (key === "all" || key === "custom") return null;
  if (key === "today") return today;
  const base = new Date(`${today}T00:00:00`);
  const days = key === "week" ? 6 : key === "1m" ? 29 : key === "6m" ? 182 : 364; // inclusive windows
  base.setDate(base.getDate() - days);
  return ymd(base);
}

/**
 * Does a "YYYY-MM-DD" (or ISO timestamp) date fall in the selected range?
 * For "custom", from/to are inclusive "YYYY-MM-DD" bounds (either may be empty).
 */
export function dateInRange(
  dateLike: string,
  key: TimeRangeKey,
  today: string,
  customFrom?: string,
  customTo?: string,
): boolean {
  if (!dateLike) return false;
  const date = dateLike.slice(0, 10);
  if (key === "custom") {
    if (customFrom && date < customFrom) return false;
    if (customTo && date > customTo) return false;
    return true;
  }
  const cutoff = rangeCutoff(key, today);
  if (cutoff && date < cutoff) return false;
  if (key === "today" && date !== today) return false;
  return true;
}

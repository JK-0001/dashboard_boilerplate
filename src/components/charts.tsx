/**
 * Chart kit — the ONLY way charts appear in dashboards.
 *
 * - Style constants are built from CSS variables, so every chart flips with
 *   dark mode automatically (no JS theme handling).
 * - <ChartCard> enforces the loading → empty → chart triad every widget uses.
 * - zeroFillDays pre-seeds every day in the window so gaps render as zeros
 *   instead of collapsing the axis.
 * - Series colors: hsl(var(--primary)) for the main series, TONE_HEX from
 *   src/lib/status.ts for status-keyed series (badge and slice can't drift).
 */
import type { CSSProperties, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { fmtDateShort } from "@/lib/format";

/** Tooltip contentStyle — popover look in both themes. */
export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "calc(var(--radius) - 2px)",
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

/** Axis tick props. */
export const CHART_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

/** Hover cursor fill for bar charts. */
export const CHART_CURSOR = { fill: "hsl(var(--muted))", opacity: 0.5 };

/** Grid stroke. */
export const CHART_GRID = "hsl(var(--border))";

interface ChartCardProps {
  title: string;
  action?: ReactNode;
  loading?: boolean;
  /** Render the empty state when true (e.g. rows.length === 0). */
  empty?: boolean;
  emptyText?: string;
  height?: number;
  children: ReactNode;
}

export function ChartCard({
  title, action, loading, empty, emptyText = "No data yet.", height = 220, children,
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton style={{ height }} className="w-full" />
        ) : empty ? (
          <div
            style={{ height }}
            className="flex flex-col items-center justify-center gap-2 text-muted-foreground"
          >
            <BarChart3 className="h-8 w-8" />
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

export interface DayPoint {
  date: string;  // YYYY-MM-DD
  label: string; // "07 May"
  value: number;
}

/**
 * Bucket rows into the last `days` days, seeding every day with 0 so the
 * x-axis is continuous even when nothing happened.
 */
export function zeroFillDays<T>(
  rows: T[],
  getDate: (row: T) => string | null | undefined,
  days = 14,
  getValue: (row: T) => number = () => 1,
): DayPoint[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    buckets.set(key, 0);
  }
  for (const row of rows) {
    const key = String(getDate(row) ?? "").slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + getValue(row));
  }
  return [...buckets.entries()].map(([date, value]) => ({
    date,
    label: fmtDateShort(date),
    value,
  }));
}

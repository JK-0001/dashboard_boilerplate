/**
 * Shared formatting helpers — the single source of truth for how numbers,
 * money, and dates render everywhere (tables, dashboards, exports).
 *
 * Conventions:
 *  - Amounts render in `font-mono`, right-aligned, with the currency symbol.
 *  - Zero renders as "—" in ledger-style tables (use fmtAmtOrDash).
 *  - Dates are "07 May 2026" (full) or "07 May" (compact).
 */
import { CURRENCY } from "@/lib/appConfig";

/** Rounded, no decimals — dashboards/KPIs. e.g. ₹1,23,457 */
export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return `${CURRENCY.symbol}0`;
  return CURRENCY.symbol + Math.round(n).toLocaleString(CURRENCY.locale);
}

/** Always 2 decimals — reports/statements. e.g. ₹1,23,456.70 */
export function fmtAmt(n: number): string {
  return (
    CURRENCY.symbol +
    n.toLocaleString(CURRENCY.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Up to 2 decimals, absolute value, zero → "—" — ledger cells. */
export function fmtAmtOrDash(n: number): string {
  if (n === 0) return "—";
  return (
    CURRENCY.symbol +
    Math.abs(n).toLocaleString(CURRENCY.locale, { maximumFractionDigits: 2 })
  );
}

/** Plain quantity/count with locale grouping. */
export function fmtQty(n: number | null | undefined): string {
  if (n == null) return "0";
  return Number(n).toLocaleString(CURRENCY.locale);
}

/** "07 May 2026" — lists, ledgers, reports. */
export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(CURRENCY.locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "07 May" — compact widgets. */
export function fmtDateShort(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(CURRENCY.locale, { day: "2-digit", month: "short" });
}

/** Accounting Dr/Cr suffix + color (Dr = red, Cr = green). */
export const balLabel = (b: number) => (b >= 0 ? "Dr" : "Cr");
export const balClass = (b: number) => (b >= 0 ? "text-red-600" : "text-green-600");

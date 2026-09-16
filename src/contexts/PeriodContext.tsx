/**
 * Global reporting period — the top-bar PeriodPicker sets it; any
 * period-aware page (Dashboard KPIs, reports, …) reads it via usePeriod()
 * and filters with inPeriod(). Persisted per browser.
 *
 * Presets include the Indian financial year (1 April – 31 March), matching
 * the ₹/en-IN bias of src/lib/format.ts. Adjust presets per project if the
 * client's fiscal calendar differs.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { STORAGE_PREFIX } from "@/lib/appConfig";

export type Period = { from: string; to: string; label: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = () => new Date();

/** Start of the current Indian FY (1 April). */
export function fyStart(d = today()): Date {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(y, 3, 1);
}

export const PERIOD_PRESETS: { key: string; label: string; range: () => { from: string; to: string } }[] = [
  { key: "this_month", label: "This month", range: () => ({ from: iso(new Date(today().getFullYear(), today().getMonth(), 1)), to: iso(today()) }) },
  { key: "last_month", label: "Last month", range: () => {
      const d = today();
      return { from: iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: iso(new Date(d.getFullYear(), d.getMonth(), 0)) };
    } },
  { key: "this_quarter", label: "This quarter", range: () => {
      const d = today(); const q = Math.floor(d.getMonth() / 3) * 3;
      return { from: iso(new Date(d.getFullYear(), q, 1)), to: iso(d) };
    } },
  { key: "this_fy", label: "This FY", range: () => ({ from: iso(fyStart()), to: iso(today()) }) },
  { key: "last_fy", label: "Last FY", range: () => {
      const s = fyStart(); const prev = new Date(s.getFullYear() - 1, 3, 1);
      return { from: iso(prev), to: iso(new Date(s.getFullYear(), 2, 31)) };
    } },
  { key: "all", label: "All time", range: () => ({ from: "2000-01-01", to: iso(today()) }) },
];

const DEFAULT: Period = { ...PERIOD_PRESETS.find((p) => p.key === "all")!.range(), label: "All time" };
const KEY = `${STORAGE_PREFIX}_period`;

const Ctx = createContext<{ period: Period; setPeriod: (p: Period) => void }>({
  period: DEFAULT,
  setPeriod: () => {},
});

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriodState] = useState<Period>(DEFAULT);
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v) setPeriodState(JSON.parse(v));
    } catch { /* default stays */ }
  }, []);
  const setPeriod = (p: Period) => {
    setPeriodState(p);
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
  };
  return <Ctx.Provider value={{ period, setPeriod }}>{children}</Ctx.Provider>;
}

export const usePeriod = () => useContext(Ctx);

/** True when the ISO timestamp/date falls inside the period (inclusive). */
export function inPeriod(dateLike: string | null | undefined, p: Period): boolean {
  if (!dateLike) return true;
  const d = String(dateLike).slice(0, 10);
  return d >= p.from && d <= p.to;
}

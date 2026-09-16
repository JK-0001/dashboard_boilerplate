/**
 * Status palette — ONE source of truth for how every status in the app is
 * labelled and coloured. Pages never pick status colours themselves: they
 * declare a status map here and render through <StatusBadge> / statusMeta().
 *
 * Semantic tones (house convention):
 *   success → emerald · warning/pending → amber · error/overdue → red
 *   info → blue · neutral/inactive → slate · violet → "AI / drafted" states
 *
 * TONE_HEX exists so recharts (which needs literal colours) draws with the
 * SAME vocabulary — a pie slice and its badge can never drift apart.
 */
import type { ProductStatus, SupplierStatus } from "@/lib/demoStore";

export type Tone = "success" | "warning" | "error" | "info" | "neutral" | "violet" | "cyan";

export const TONE_BADGE: Record<Tone, string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  warning: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  error: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  info: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  neutral: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  violet: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800",
  cyan: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-800",
};

/** Solid dot / bar colour per tone (live dots, progress bars, legends). */
export const TONE_DOT: Record<Tone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  neutral: "bg-slate-400",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
};

/** Text-only colour per tone (KPI numbers, icons, due-date text). */
export const TONE_TEXT: Record<Tone, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
  neutral: "text-slate-500 dark:text-slate-400",
  violet: "text-violet-600 dark:text-violet-400",
  cyan: "text-cyan-600 dark:text-cyan-400",
};

/** Chart hex per tone (recharts needs literal colours). */
export const TONE_HEX: Record<Tone, string> = {
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  neutral: "#94a3b8",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
};

export type StatusMeta = { label: string; tone: Tone };

/** Lookup with a safe fallback so unknown statuses still render readably. */
export function statusMeta(
  map: Record<string, StatusMeta>,
  key: string | null | undefined,
): StatusMeta {
  if (!key) return { label: "—", tone: "neutral" };
  return map[key] ?? { label: key.replace(/_/g, " "), tone: "neutral" };
}

// ── Entity status maps — add one per entity, next to these ─────────────────

export const PRODUCT_STATUS: Record<ProductStatus, StatusMeta> = {
  active: { label: "Active", tone: "success" },
  low_stock: { label: "Low stock", tone: "warning" },
  discontinued: { label: "Discontinued", tone: "neutral" },
};

export const SUPPLIER_STATUS: Record<SupplierStatus, StatusMeta> = {
  active: { label: "Active", tone: "success" },
  on_hold: { label: "On hold", tone: "warning" },
  blacklisted: { label: "Blacklisted", tone: "error" },
};

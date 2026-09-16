/**
 * Activity log — "who did what, when" for the whole app.
 *
 * logActivity() is FIRE-AND-FORGET by contract: it must never throw into
 * the calling mutation (losing the user's save because logging hiccuped is
 * worse than losing the log line). Call it from mutation onSuccess for
 * things the DB can't see attribution for (exports, imports, logins) and
 * for demo mode; with a real backend the generic DB trigger in
 * supabase/migrations/0001_audit_log.sql captures data changes for free —
 * keep client logging only for the non-data events.
 */
import { uid } from "@/lib/utils";
import type { StatusMeta } from "@/lib/status";

export type ActivityAction =
  | "create" | "update" | "delete" | "import" | "export" | "login" | "other";

export interface ActivityRow {
  id: string;
  at: string; // ISO timestamp
  user: string;
  action: ActivityAction;
  entity_type: string;
  entity_id?: string | null;
  summary: string;
}

/** Tone per verb — feed badges/icons colour themselves off this. */
export const ACTIVITY_ACTION_META: Record<ActivityAction, StatusMeta> = {
  create: { label: "Created", tone: "success" },
  update: { label: "Updated", tone: "info" },
  delete: { label: "Deleted", tone: "error" },
  import: { label: "Imported", tone: "violet" },
  export: { label: "Exported", tone: "cyan" },
  login: { label: "Signed in", tone: "neutral" },
  other: { label: "Activity", tone: "neutral" },
};

const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

// DEMO in-memory store — replace with an `activity_log` table + insert.
let rows: ActivityRow[] = [
  { id: uid(), at: hoursAgo(2),  user: "Jatin Khatri", action: "create", entity_type: "product", entity_id: null, summary: "Created product Steel Bolt M8" },
  { id: uid(), at: hoursAgo(5),  user: "Asha Verma",   action: "update", entity_type: "product", entity_id: null, summary: "Updated stock on Bearing 6305" },
  { id: uid(), at: hoursAgo(26), user: "Rohit Malhotra", action: "export", entity_type: "products", entity_id: null, summary: "Exported 12 rows as PDF" },
  { id: uid(), at: hoursAgo(30), user: "Jatin Khatri", action: "delete", entity_type: "product", entity_id: null, summary: "Deleted product V-Belt B40" },
];

/** Best-effort log write. NEVER throws. */
export function logActivity(e: {
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  user?: string;
}): void {
  try {
    rows = [
      {
        id: uid(),
        at: new Date().toISOString(),
        user: e.user ?? "You",
        action: e.action,
        entity_type: e.entityType,
        entity_id: e.entityId ?? null,
        summary: e.summary,
      },
      ...rows,
    ].slice(0, 500);
  } catch (err) {
    console.error("[activityLog]", err);
  }
}

export const activityApi = {
  async list(): Promise<ActivityRow[]> {
    await new Promise((r) => setTimeout(r, 250));
    return [...rows];
  },
};

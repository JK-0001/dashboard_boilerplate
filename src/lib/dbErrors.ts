/**
 * Translate Supabase / Postgres errors into user-friendly toast messages.
 *
 * Supabase returns a `PostgrestError` with a `code` (Postgres SQLSTATE) and a
 * `message`. We map common codes — and known constraint names — to friendly
 * text. Unknown errors fall through to the original message.
 */

type AnyError = Partial<{
  code: string;
  message: string;
  details: string;
  hint: string;
}> | Error | unknown;

/**
 * Maps unique-constraint / index names → human-readable messages.
 * Keep keys in sync with SQL migrations.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  // Per-company uniqueness
  items_company_name_key:             "An item with this name already exists.",
  areas_company_name_key:             "An area with this name already exists.",
  item_groups_company_name_key:       "An item group with this name already exists.",
  godowns_company_name_key:           "A godown with this name already exists.",
  financial_years_company_name_key:   "A financial year with this name already exists.",
  financial_years_company_start_key:  "A financial year with this start date already exists.",
  godown_stock_godown_id_item_id_key: "Stock entry already exists for this item in this godown.",
};

export function friendlyDbError(err: unknown, fallback = "Something went wrong"): string {
  if (!err) return fallback;
  const e = err as { code?: string; message?: string };
  const msg  = e.message ?? fallback;
  const code = e.code;

  // 23505 — unique_violation
  if (code === "23505" || /duplicate key|unique constraint/i.test(msg)) {
    const match = msg.match(/"([^"]+)"/);
    const constraintName = match?.[1];
    if (constraintName && CONSTRAINT_MESSAGES[constraintName]) {
      return CONSTRAINT_MESSAGES[constraintName];
    }
    return "This entry already exists. Please use a different name.";
  }

  // 23503 — foreign_key_violation
  if (code === "23503" || /foreign key/i.test(msg)) {
    return "Cannot delete — this record is referenced by other records.";
  }

  // 23502 — not_null_violation
  if (code === "23502" || /null value.*not-null/i.test(msg)) {
    return "A required field is missing.";
  }

  // 23514 — check_violation
  if (code === "23514" || /check constraint/i.test(msg)) {
    return "Invalid value — please check the data and try again.";
  }

  return msg;
}

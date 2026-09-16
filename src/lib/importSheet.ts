/**
 * importSheet — turn a CSV/XLS/XLSX file into typed rows the app can save.
 * Schema-driven and entity-agnostic: pages declare ImportFields and a
 * buildRow() transform; this module owns parsing and cleaning only, so the
 * preview the user approves is exactly what gets written.
 *
 * Real-world lessons baked in (mined from production imports):
 *  - Files have multiple tabs → caller gets every sheet, shows a picker.
 *  - The header is rarely row 1 (title banners) → guessHeaderRow scores the
 *    top 15 rows for "looks like column names" instead of trusting row 0.
 *  - Column names lie → the mapping is only a GUESS; the user can remap
 *    every field in the wizard.
 *  - Numbers arrive as "₹1,234.50" → coerce strips currency/commas.
 *  - Text can be double-encoded (UTF-8 read as Latin-1) → fixMojibake
 *    repairs it only when the telltale bytes are present.
 */
import * as XLSX from "xlsx";

export interface ParsedSheet {
  name: string;
  /** Raw grid, blank-padded. Row 0 is the first row of the file. */
  rows: string[][];
}

export interface ImportField {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** Header patterns that auto-map this field (user can override). */
  aliases: RegExp;
  type?: "text" | "number" | "date";
}

/** Column index per field key; -1 means "not mapped". */
export type Mapping = Record<string, number>;

export const emptyMapping = (fields: ImportField[]): Mapping =>
  Object.fromEntries(fields.map((f) => [f.key, -1]));

/* ══════════════════════ Reading the file ══════════════════════ */

/** XLSX.read handles .xlsx, .xls AND .csv — one path covers all three. */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSheet[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true, raw: false });
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const grid = XLSX.utils.sheet_to_json<string[]>(ws, {
      header: 1,
      blankrows: true,
      defval: "",
      raw: false,
    });
    const width = grid.reduce((w, r) => Math.max(w, r?.length ?? 0), 0);
    return {
      name,
      rows: grid.map((r) => Array.from({ length: width }, (_, i) => cellText(r?.[i]))),
    };
  });
}

function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

/**
 * Pick the most likely header row: the first row in the top 15 whose cells
 * look like column names rather than data — several short non-empty cells,
 * none of which is a phone-like number. Banner rows are one long cell, so
 * they score badly and get skipped.
 */
export function guessHeaderRow(rows: string[][]): number {
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const cells = rows[i].filter((c) => c !== "");
    if (cells.length < 2) continue;
    const shortish = cells.filter((c) => c.length <= 24).length;
    const numeric = cells.filter((c) => /^\+?\d[\d\s-]{6,}$/.test(c)).length;
    const score = shortish * 2 - numeric * 3 - (cells.length === 1 ? 5 : 0);
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

/** A starting point for the mapping — the user can change every line. */
export function guessMapping(headers: string[], fields: ImportField[]): Mapping {
  const map = emptyMapping(fields);
  const taken = new Set<number>();
  // Required fields claim their columns first so a looser optional pattern
  // can't swallow a column a required field needs.
  const order = [...fields].sort((a, b) => Number(b.required ?? false) - Number(a.required ?? false));
  for (const f of order) {
    const i = headers.findIndex((h, idx) => h && !taken.has(idx) && f.aliases.test(h));
    if (i >= 0) { map[f.key] = i; taken.add(i); }
  }
  return map;
}

/* ══════════════════════ Cleaning values ══════════════════════ */

/** Repair UTF-8-read-as-Latin-1 text; clean text is never touched. */
export function fixMojibake(s: string): string {
  if (!/[ÃÂà¤à¥]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return /[ऀ-ॿ]/.test(decoded) ? decoded : s;
  } catch {
    return s;
  }
}

/** "₹1,23,456.50" → 123456.5 ; "" / junk → null. */
export function coerceNumber(raw: string): number | null {
  const cleaned = (raw || "").replace(/[₹$€£,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

/**
 * "07/05/2026", "2026-05-07", ISO timestamps → "YYYY-MM-DD".
 * dd/mm/yyyy is assumed (Indian convention); ambiguous junk → null.
 */
export function coerceDate(raw: string): string | null {
  const s = (raw || "").trim();
  if (!s) return null;
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const dmy = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const dd = Number(d), mm = Number(m);
    if (mm > 12 || dd > 31) return null;
    return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  return null;
}

/** Apply per-type coercion + mojibake repair to one mapped cell. */
export function coerceValue(raw: string, type: ImportField["type"]): string {
  const fixed = fixMojibake(raw ?? "").trim();
  if (type === "number") {
    const n = coerceNumber(fixed);
    return n == null ? "" : String(n);
  }
  if (type === "date") return coerceDate(fixed) ?? "";
  return fixed;
}

/* ══════════════════════ Building rows ══════════════════════ */

export interface BuildResult<T> {
  ready: T[];
  /** 1-based spreadsheet row numbers with the reason each was skipped. */
  issues: { row: number; reason: string }[];
  dupExisting: number;
  dupInFile: number;
}

/**
 * Walk data rows below the header, map + coerce cells into a record, run the
 * caller's transform (return `{ error }` to reject a row), and dedupe both
 * within the file and against existing records.
 */
export function buildRows<T>(opts: {
  rows: string[][];
  headerRow: number;
  mapping: Mapping;
  fields: ImportField[];
  transform: (rec: Record<string, string>, rowIndex: number) => T | { error: string };
  /** Stable key for duplicate detection (e.g. lowercased SKU). */
  dedupeKey?: (row: T) => string;
  existingKeys?: Set<string>;
}): BuildResult<T> {
  const { rows, headerRow, mapping, fields, transform, dedupeKey, existingKeys } = opts;
  const ready: T[] = [];
  const issues: { row: number; reason: string }[] = [];
  const seen = new Set<string>();
  let dupExisting = 0;
  let dupInFile = 0;

  for (let i = headerRow + 1; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw || raw.every((c) => c === "")) continue; // blank line

    const rec: Record<string, string> = {};
    for (const f of fields) {
      const col = mapping[f.key];
      rec[f.key] = col >= 0 ? coerceValue(raw[col], f.type) : "";
    }

    const missing = fields.find((f) => f.required && !rec[f.key]);
    if (missing) {
      issues.push({ row: i + 1, reason: `missing ${missing.label}` });
      continue;
    }

    const built = transform(rec, i + 1);
    if (built && typeof built === "object" && "error" in built && typeof (built as { error: unknown }).error === "string") {
      issues.push({ row: i + 1, reason: (built as { error: string }).error });
      continue;
    }

    const row = built as T;
    if (dedupeKey) {
      const key = dedupeKey(row);
      if (key) {
        if (existingKeys?.has(key)) { dupExisting++; continue; }
        if (seen.has(key)) { dupInFile++; continue; }
        seen.add(key);
      }
    }
    ready.push(row);
  }

  return { ready, issues, dupExisting, dupInFile };
}

/** Emit a correct starter CSV so users can fill data in the right shape. */
export function downloadTemplateCsv(fields: ImportField[], filename: string) {
  const header = fields.map((f) => f.label).join(",");
  const blob = new Blob([header + "\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_template.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

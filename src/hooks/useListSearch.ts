import { useMemo, useState } from "react";

/**
 * A searchable column descriptor for useListSearch / ColumnFilter.
 *
 * `get` returns the value used for the global box, the per-column "contains"
 * text filter, and the distinct-value checklist. Mark `hidden` for fields that
 * should be matched by the global box but have no column of their own.
 */
export type SearchColumn<T> = {
  key: string;
  get: (row: T) => string | number | null | undefined;
  hidden?: boolean;
};

const asStr = (v: unknown) => String(v ?? "");

/**
 * useListSearch — global search (matches ALL columns incl. hidden) plus
 * per-column filters. Each column supports a "contains" text filter AND a
 * checkable set of distinct values (Google-Sheets style). A row passes when it
 * matches the global query AND every active per-column filter.
 */
export function useListSearch<T>(rows: T[], columns: SearchColumn<T>[]) {
  const [global, setGlobal] = useState("");
  const [colText, setColText] = useState<Record<string, string>>({});
  // Per column: explicit list of allowed values. Absent = no value filter (all).
  const [colValues, setColValues] = useState<Record<string, string[]>>({});

  const filtered = useMemo(() => {
    const g = global.trim().toLowerCase();
    return rows.filter((row) => {
      if (g && !columns.some((c) => asStr(c.get(row)).toLowerCase().includes(g))) return false;
      for (const c of columns) {
        const t = (colText[c.key] ?? "").trim().toLowerCase();
        if (t && !asStr(c.get(row)).toLowerCase().includes(t)) return false;
        const vals = colValues[c.key];
        if (vals && vals.length && !vals.includes(asStr(c.get(row)))) return false;
      }
      return true;
    });
  }, [rows, columns, global, colText, colValues]);

  /** Distinct non-empty values for a column (from the full row set). */
  const optionsFor = (key: string): string[] => {
    const col = columns.find((c) => c.key === key);
    if (!col) return [];
    const set = new Set<string>();
    rows.forEach((r) => set.add(asStr(col.get(r))));
    return [...set].filter((v) => v !== "").sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  };

  const setText = (key: string, v: string) => setColText((p) => ({ ...p, [key]: v }));
  const setValues = (key: string, vals: string[] | null) =>
    setColValues((p) => {
      const n = { ...p };
      if (!vals || !vals.length) delete n[key];
      else n[key] = vals;
      return n;
    });

  const isActive = (key: string) => !!(colText[key]?.trim()) || !!(colValues[key]?.length);
  const anyActive = global.trim() !== "" || columns.some((c) => isActive(c.key));
  const clear = () => { setGlobal(""); setColText({}); setColValues({}); };

  return {
    filtered, global, setGlobal,
    colText, setText, colValues, setValues,
    optionsFor, isActive, anyActive, clear,
  };
}

export type ListSearch<T> = ReturnType<typeof useListSearch<T>>;

/**
 * ColumnFilter — a small funnel icon shown next to a column header. Clicking it
 * opens a Google-Sheets-style popover: a "contains" text box plus a checkable
 * list of the column's distinct values. The icon turns solid/primary when a
 * filter is active for that column.
 *
 * Usage (inside a <TableHead>):
 *   <div className="flex items-center gap-1">
 *     Customer
 *     <ColumnFilter colKey="ledger_name" search={search} />
 *   </div>
 */
import * as React from "react";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ListSearch } from "@/hooks/useListSearch";

interface ColumnFilterProps<T> {
  colKey: string;
  search: ListSearch<T>;
}

export function ColumnFilter<T>({ colKey, search }: ColumnFilterProps<T>) {
  const [open, setOpen] = React.useState(false);
  const active = search.isActive(colKey);
  // Compute distinct options only while open (cheap, avoids work on every render).
  const options = open ? search.optionsFor(colKey) : [];
  const selected = search.colValues[colKey]; // undefined = all checked
  const text = search.colText[colKey] ?? "";

  const isChecked = (opt: string) => !selected || selected.includes(opt);

  const toggle = (opt: string) => {
    const cur = selected ?? options;
    const next = cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt];
    // All checked or none checked → treat as "no value filter".
    if (next.length === 0 || next.length === options.length) search.setValues(colKey, null);
    else search.setValues(colKey, next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded transition-colors",
            active
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground/50 hover:bg-muted hover:text-foreground",
          )}
          title="Filter column"
        >
          <Filter className={cn("h-3 w-3", active && "fill-current")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2" onClick={(e) => e.stopPropagation()}>
        <Input
          autoFocus
          placeholder="Contains…"
          value={text}
          onChange={(e) => search.setText(colKey, e.target.value)}
          className="mb-2 h-7 text-xs"
        />
        <div className="mb-1 flex items-center justify-between px-0.5 text-[11px] text-muted-foreground">
          <button type="button" className="hover:text-foreground" onClick={() => search.setValues(colKey, null)}>
            Select all
          </button>
          <span>{options.length} value{options.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="max-h-52 space-y-0.5 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">No values</p>
          ) : (
            options.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-primary"
                  checked={isChecked(opt)}
                  onChange={() => toggle(opt)}
                />
                <span className="truncate" title={opt}>{opt}</span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

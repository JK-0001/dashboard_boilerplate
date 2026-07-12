/**
 * MultiSelectCombobox — searchable multi-select with a comma-separated summary.
 *
 * Closed: shows the selected option names joined by ", " (or the placeholder).
 * Open: the field becomes a search box; matching options appear as a checklist.
 * Clicking an option toggles it and keeps the list open. Uses position:fixed so
 * it escapes overflow:hidden parents, and a native mousedown listener to keep
 * focus while clicking items (same approach as EntityCombobox).
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type MultiOption = { id: string; name: string };

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  options: MultiOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  size?: "default" | "sm";
  maxResults?: number;
}

export function MultiSelectCombobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  className,
  size = "default",
  maxResults,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlighted, setHighlighted] = React.useState(-1);
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 240 });

  const selectedNames = options.filter((o) => value.includes(o.id)).map((o) => o.name);
  const summary = selectedNames.join(", ");

  const calcPos = React.useCallback(() => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 240) });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", calcPos, true);
    window.addEventListener("resize", calcPos);
    return () => {
      window.removeEventListener("scroll", calcPos, true);
      window.removeEventListener("resize", calcPos);
    };
  }, [open, calcPos]);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const stop = (e: MouseEvent) => e.preventDefault();
    el.addEventListener("mousedown", stop);
    return () => el.removeEventListener("mousedown", stop);
  });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q ? options : options.filter((o) => o.name.toLowerCase().includes(q));
    return maxResults ? base.slice(0, maxResults) : base;
  }, [options, query, maxResults]);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  // Reset the highlight whenever the query changes or the list reopens.
  React.useEffect(() => { setHighlighted(filtered.length ? 0 : -1); }, [query, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the highlighted row scrolled into view.
  React.useEffect(() => {
    if (!open || highlighted < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${highlighted}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlighted >= 0 && highlighted < filtered.length) toggle(filtered[highlighted].id);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
        break;
      case "Tab":
        // Let the browser move focus to the next field — just close the list.
        setOpen(false);
        setQuery("");
        break;
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <input
        ref={inputRef}
        type="text"
        readOnly={!open}
        placeholder={placeholder}
        value={open ? query : summary}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { calcPos(); setQuery(""); setOpen(true); }}
        onBlur={() => setTimeout(() => { setOpen(false); setQuery(""); }, 150)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors cursor-pointer",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 truncate",
          size === "sm" && "h-8 text-xs px-2",
        )}
      />
      {open && (
        <div
          ref={listRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden"
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              filtered.map((o, idx) => {
                const checked = value.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    tabIndex={-1}
                    data-idx={idx}
                    onMouseEnter={() => setHighlighted(idx)}
                    onClick={() => toggle(o.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground",
                      checked && "bg-accent/50",
                      highlighted === idx && "bg-accent text-accent-foreground",
                    )}
                  >
                    <Check className={cn("h-3.5 w-3.5 shrink-0", checked ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{o.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

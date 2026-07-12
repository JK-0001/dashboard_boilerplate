/**
 * EntityCombobox — inline text input with real-time searchable dropdown.
 *
 * Dropdown uses position:fixed (not absolute) so it escapes overflow:hidden
 * parents (like table wrappers) without needing a React portal.
 * Blur prevention uses a native DOM mousedown listener on the list element,
 * which reliably prevents focus from leaving the input when clicking an item.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, Plus } from "lucide-react";

export type ComboOption = { id: string; name: string; sub?: string };

interface EntityComboboxProps {
  value: string;
  onChange: (id: string) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onCreateNew?: (query: string) => void;
  createLabel?: string;
  className?: string;
  noneLabel?: string;
  disabled?: boolean;
  size?: "default" | "sm";
  /** Cap how many options are rendered (e.g. 15) — keeps a huge list from
   *  dumping everything when the field is empty. User types to narrow. */
  maxResults?: number;
  /** Treat the value as free text: when it doesn't match an option, still
   *  show it (instead of blank). Used for City where custom names are allowed. */
  freeText?: boolean;
  /** Applied to the inner <input> so callers can focus it programmatically
   *  (used by the Sales/Purchase Enter-navigation flow). */
  id?: string;
  /** Fired right after Enter commits a selection (option or free-text). Lets
   *  the parent advance focus to the next field. When provided, pressing Enter
   *  with no highlighted row also accepts the top filtered match. */
  onEnterSelect?: () => void;
}

export function EntityCombobox({
  value,
  onChange,
  options,
  placeholder = "Type to search…",
  emptyText = "No matches",
  onCreateNew,
  createLabel = "Create new",
  className,
  noneLabel,
  disabled,
  size = "default",
  maxResults,
  freeText,
  id,
  onEnterSelect,
}: EntityComboboxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef  = React.useRef<HTMLDivElement>(null);

  const [open, setOpen]               = React.useState(false);
  const [query, setQuery]             = React.useState("");
  const [highlighted, setHighlighted] = React.useState(-1);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>({
    top: 0, left: 0, width: 220,
  });

  const selected = options.find((o) => o.id === value);

  // ── Position calculation ──────────────────────────────────────────────────
  const calcPos = React.useCallback(() => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
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

  // ── Prevent input blur when clicking inside the list ─────────────────────
  // Using a NATIVE DOM listener (not React synthetic) guarantees e.preventDefault()
  // actually stops focus from leaving the input, regardless of React version.
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const stop = (e: MouseEvent) => e.preventDefault();
    el.addEventListener("mousedown", stop);
    return () => el.removeEventListener("mousedown", stop);
  }); // runs after every render so the listener is always fresh

  // ── Filtered options ──────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? options
      : options.filter(
          (o) => o.name.toLowerCase().includes(q) || (o.sub?.toLowerCase().includes(q) ?? false),
        );
    return maxResults ? base.slice(0, maxResults) : base;
  }, [options, query, maxResults]);

  const noneOffset = noneLabel ? 1 : 0;
  // Only offer "Create new …" when the typed text doesn't already match an
  // existing option exactly (case-insensitive). This prevents the create row
  // from appearing when an existing record is simply selected/re-focused.
  const trimmedQuery = query.trim();
  const exactMatch = options.some((o) => o.name.toLowerCase() === trimmedQuery.toLowerCase());
  const showCreate = !!(onCreateNew && trimmedQuery && !exactMatch);
  const totalItems = noneOffset + filtered.length + (showCreate ? 1 : 0);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const selectOption = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  // Tracks whether handleFocus has run very recently. Radix Dialog's focus
  // trap can fire focus twice in quick succession when the dialog opens —
  // without this guard, the second focus would wipe whatever the user has
  // already started typing.
  const justFocusedRef = React.useRef(false);

  const handleFocus = () => {
    if (justFocusedRef.current) return;
    justFocusedRef.current = true;
    setTimeout(() => { justFocusedRef.current = false; }, 250);

    calcPos();
    setQuery(selected?.name ?? (freeText ? value : ""));
    setHighlighted(-1);
    setOpen(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  // On mount, check if our input is already the active element. This handles
  // the case where a parent (e.g. Radix Dialog's focus trap) calls .focus()
  // on the input *before* React attaches the onFocus listener — in which
  // case the focus event never fires through React and the dropdown stays
  // closed until the user moves focus away and back.
  React.useEffect(() => {
    if (document.activeElement === inputRef.current) {
      handleFocus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBlur = () => {
    // Small delay to let a click on a list item fire first.
    // The native mousedown listener above prevents blur from happening
    // in the first place when clicking inside the list, so this is just
    // a safety net for Tab / clicking truly outside.
    setTimeout(() => {
      // If focus has bounced back to our own input (e.g. Radix Dialog's focus
      // trap re-asserts focus right after open), or moved inside our list,
      // don't close — otherwise the dropdown would shut just as the user is
      // about to type.
      if (document.activeElement === inputRef.current) return;
      if (listRef.current && listRef.current.contains(document.activeElement)) return;
      // Free-text fields (City, Units): commit whatever was typed so a custom
      // value is kept without needing a "create" row in the list.
      if (freeText) onChange(query.trim());
      setOpen(false);
      setQuery("");
    }, 150);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setHighlighted(-1);
    if (!open) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, totalItems - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter": {
        e.preventDefault();
        const advance = () => { if (onEnterSelect) setTimeout(() => onEnterSelect(), 0); };
        if (highlighted < 0) {
          // Free-text: pressing Enter with no highlighted option commits the typed value.
          if (freeText) { onChange(query.trim()); setOpen(false); setQuery(""); advance(); break; }
          // With onEnterSelect (Enter-nav flow): accept the top filtered match.
          if (onEnterSelect && filtered.length > 0) { selectOption(filtered[0].id); advance(); }
          break;
        }
        if (noneLabel && highlighted === 0) {
          selectOption("");
          advance();
        } else if (showCreate && highlighted === totalItems - 1) {
          onCreateNew!(query.trim());
          setOpen(false);
          setQuery("");
        } else {
          const idx = highlighted - noneOffset;
          if (idx >= 0 && idx < filtered.length) { selectOption(filtered[idx].id); advance(); }
        }
        break;
      }
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setQuery("");
        break;
      case "Tab":
        setOpen(false);
        setQuery("");
        break;
    }
  };

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (!open || highlighted < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${highlighted}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  // ── Render ────────────────────────────────────────────────────────────────
  const displayValue = open ? query : (selected?.name ?? (freeText ? value : ""));

  return (
    <div className={cn("relative w-full", className)}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" && "h-8 text-xs px-2",
        )}
      />

      {open && (
        <div
          ref={listRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
          }}
          className="rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden"
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {noneLabel && (
              <button
                type="button"
                tabIndex={-1}
                data-idx={0}
                onClick={() => selectOption("")}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                  highlighted === 0 && "bg-accent text-accent-foreground",
                )}
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0", !value ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground">{noneLabel}</span>
              </button>
            )}

            {filtered.length === 0 && !showCreate && (
              <p className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</p>
            )}

            {filtered.map((o, idx) => {
              const itemIdx = noneOffset + idx;
              return (
                <button
                  key={o.id}
                  type="button"
                  tabIndex={-1}
                  data-idx={itemIdx}
                  onClick={() => selectOption(o.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left",
                    "hover:bg-accent hover:text-accent-foreground",
                    highlighted === itemIdx && "bg-accent text-accent-foreground",
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", value === o.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{o.name}</span>
                    {o.sub && (
                      <span className="text-xs text-muted-foreground truncate">{o.sub}</span>
                    )}
                  </div>
                </button>
              );
            })}

            {showCreate && (
              <button
                type="button"
                tabIndex={-1}
                data-idx={totalItems - 1}
                onClick={() => {
                  onCreateNew!(query.trim());
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm text-primary",
                  "hover:bg-accent",
                  highlighted === totalItems - 1 && "bg-accent",
                )}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>{createLabel} &ldquo;{query.trim()}&rdquo;</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

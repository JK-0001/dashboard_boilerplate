/**
 * InlineEditCell — double-click a cell to turn it into an input, Enter to save,
 * Esc to cancel. Click outside also saves. Pairs nicely with optimistic UI:
 * the parent's onSave can be a no-await call that updates local state instantly.
 *
 * Used on the contacts page for activity / city, and on leads page for notes.
 * Keeps the row hover/click-to-open behavior intact by stopping propagation
 * on edit-mode events.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  placeholder?: string;
  className?: string;
  /** Render the rest-state cell with this. Defaults to {value || placeholder}. */
  displayValue?: string;
  /** Title attribute for the rest cell. */
  title?: string;
}

export function InlineEditCell({ value, onSave, placeholder = "—", className, displayValue, title }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // When external value changes (e.g. optimistic update completed elsewhere),
  // and we're NOT in edit mode, sync the draft.
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = async () => {
    setEditing(false);
    if (draft === value) return;
    try { await onSave(draft); } catch { /* parent handles error toast */ }
  };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") { e.preventDefault(); void commit(); }
          else if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        className={cn(
          "w-full rounded border border-ring/40 bg-background px-1.5 py-0.5 text-xs text-foreground outline-none ring-2 ring-ring/20",
          className,
        )}
      />
    );
  }
  return (
    <span
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title={title ?? "Double-click to edit"}
      className={cn(
        "block cursor-text rounded border border-transparent px-1.5 py-0.5 text-xs hover:border-border hover:bg-muted/40",
        !value && "text-muted-foreground italic",
        className,
      )}
    >
      {displayValue ?? value ?? placeholder ?? "—"}
    </span>
  );
}

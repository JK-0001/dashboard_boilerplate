/**
 * TagInput — free-text labels, added with Enter or a comma.
 *
 * Suggestions come from tags already in use rather than a managed list: the
 * coach invents these as he goes ("Money Mastery", "SUPER HOT", "buyer",
 * "raipur"), and making him define a tag before using it would defeat the
 * point. The suggestion list is only there to stop "Money Mastery" and
 * "money mastery" becoming two different tags.
 */
import { useMemo, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Type a tag and press Enter…",
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const t = raw.trim().replace(/,+$/, "").trim();
    if (!t) return;
    // Case-insensitive match against what is already there and what exists
    // elsewhere, so the stored spelling stays consistent.
    const existing = [...value, ...suggestions].find(
      (s) => s.toLowerCase() === t.toLowerCase(),
    );
    const tag = existing ?? t;
    if (!value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      onChange([...value, tag]);
    }
    setDraft("");
  };

  const remove = (t: string) => onChange(value.filter((v) => v !== t));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      // Backspace on an empty box removes the last chip — standard behaviour.
      onChange(value.slice(0, -1));
    }
  };

  const open = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    return suggestions
      .filter((s) => s.toLowerCase().includes(q) && !value.some((v) => v.toLowerCase() === s.toLowerCase()))
      .slice(0, 6);
  }, [draft, suggestions, value]);

  return (
    <div className={cn("grid gap-2", className)}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pr-1 text-[11px]">
              {t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                onClick={() => remove(t)}
                className="rounded-sm opacity-60 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={placeholder}
        />
        {open.length > 0 && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
            {open.map((s) => (
              <button
                key={s}
                type="button"
                // onMouseDown, not onClick: blur fires first and would other-
                // wise add the half-typed draft before the click registers.
                onMouseDown={(e) => { e.preventDefault(); add(s); }}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

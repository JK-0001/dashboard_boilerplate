/**
 * DateInput — fast DD/MM/YYYY text input (no FY restriction).
 *
 * - Slashes are inserted automatically as digits are typed (no picker)
 * - value / onChange props are ISO YYYY-MM-DD
 *
 * Use this for report date-range filters where any valid date is acceptable.
 * Use FYDateInput for voucher dates that must fall within the active FY.
 *
 * Typing "01041995" → displays "01/04/1995" → emits "1995-04-01"
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value: string;                        // ISO YYYY-MM-DD
  onChange: (value: string) => void;    // emits ISO YYYY-MM-DD
}

// ── helpers ───────────────────────────────────────────────────────────────────

function isoToDisplay(iso: string): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function displayToIso(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (digits.length < 8) return "";
  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

function formatDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const dd   = digits.slice(0, 2);
  const mm   = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  if (digits.length <= 2) return dd;
  if (digits.length <= 4) return `${dd}/${mm}`;
  return `${dd}/${mm}/${yyyy}`;
}

// ── component ─────────────────────────────────────────────────────────────────

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [display, setDisplay] = React.useState(() => isoToDisplay(value));

    // Sync when value changes externally
    React.useEffect(() => {
      setDisplay(isoToDisplay(value));
    }, [value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
      (props as any).onFocus?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDigits(e.target.value);
      setDisplay(formatted);

      if (formatted.length < 10) return;

      const iso = displayToIso(formatted);
      const d   = new Date(iso);
      if (!isNaN(d.getTime())) {
        onChange(iso);
      }
    };

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        maxLength={10}
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
    );
  },
);
DateInput.displayName = "DateInput";

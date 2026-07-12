/**
 * NumberInput — drop-in replacement for <Input type="number">
 *
 * Behavior:
 *   • Accepts up to 2 decimal places (e.g. 150.3, 32.1, 100.25)
 *   • Arrow keys do NOTHING special — value is typed manually only
 *     (native spinner is hidden globally via index.css)
 *   • All other props (value, onChange, className…) forwarded to <Input>
 */
import * as React from "react";
import { Input } from "@/components/ui/input";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "step"> {
  /** Maximum decimals allowed in typed input. Default 2. */
  maxDecimals?: number;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    { onChange, onKeyDown, value, maxDecimals = 2, ...props },
    ref,
  ) {
    // Block typing more than `maxDecimals` decimals
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === "" || v === "-") {
        onChange?.(e);
        return;
      }
      // Allow trailing "." while typing (e.g. "150.")
      const dotIdx = v.indexOf(".");
      if (dotIdx !== -1) {
        const decimals = v.length - dotIdx - 1;
        if (decimals > maxDecimals) return; // reject
      }
      // Must be a valid numeric string
      if (!/^-?\d*\.?\d*$/.test(v)) return;
      onChange?.(e);
    };

    // Suppress ArrowUp / ArrowDown native stepping — user types the value fully.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
      }
      onKeyDown?.(e);
    };

    return (
      <Input
        ref={ref}
        type="number"
        step="any"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  },
);

import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, step, onFocus, ...props }, ref) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all text on focus so typing immediately replaces it.
      // <input type="number"> throws InvalidStateError in Chromium when
      // .select() is called — guard with try/catch so it's a no-op there.
      try { e.target.select(); } catch { /* unsupported on number / email etc */ }
      onFocus?.(e);
    };
    // For number inputs, default step to "1" so arrow keys move by 1 (not 0.01)
    const resolvedStep = type === "number" ? (step ?? "1") : step;
    return (
      <input
        type={type}
        step={resolvedStep}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onFocus={handleFocus}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

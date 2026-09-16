/**
 * App-wide confirm dialog. Replaces the browser's native confirm() with a
 * styled, promise-based modal so imperative flows get a real "are you sure":
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete 12 products?", danger: true }))) return;
 *
 * Built on the Radix AlertDialog primitive (NOT a bare fixed div). This
 * matters: when the confirm is opened from INSIDE another modal (e.g. the
 * Sheet form), a plain div rendered outside that modal's Radix portal
 * inherits the parent's `pointer-events: none` and trapped focus, so its
 * buttons render but can't be clicked. Radix AlertDialog registers itself as
 * a nested dismissable layer, so it works even over an open parent modal.
 *
 * Esc or Cancel resolves false; the confirm button resolves true. Focus
 * defaults to Cancel (safer for destructive actions).
 *
 * When to use which: standing row-level delete buttons keep the declarative
 * <AlertDialog> wrapper; use useConfirm() inside handlers (bulk actions,
 * multi-step flows) where declarative wrapping is awkward.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
}
type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o = {}) => new Promise<boolean>((resolve) => {
    resolver.current = resolve;
    setOpts(o);
  }), []);

  const close = useCallback((val: boolean) => {
    resolver.current?.(val);
    resolver.current = null;
    setOpts(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!opts} onOpenChange={(o) => { if (!o) close(false); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              {opts?.danger && (
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <AlertDialogTitle>{opts?.title ?? "Are you sure?"}</AlertDialogTitle>
                <AlertDialogDescription className={opts?.message ? undefined : "sr-only"}>
                  {opts?.message ?? "Please confirm this action."}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>
              {opts?.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => close(true)}
              className={opts?.danger ? buttonVariants({ variant: "destructive" }) : undefined}
            >
              {opts?.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

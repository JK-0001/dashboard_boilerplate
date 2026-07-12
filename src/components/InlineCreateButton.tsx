/**
 * InlineCreateButton — a small "+" button shown next to a dropdown / select.
 *
 * Clicking it opens the relevant master's create page in a NEW BROWSER TAB
 * (e.g. "/areas?new=1"). When the user finishes creating there and switches
 * back to this tab, the `focus` event fires and we invalidate the supplied
 * React-Query keys — so the dropdown silently refetches and the new record is
 * already selectable, with no full-page reload.
 *
 * This is the project-wide replacement for the old QuickCreate mini-modals.
 */
import * as React from "react";
import { Plus } from "lucide-react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { openCreateTab } from "@/lib/openCreateTab";

interface InlineCreateButtonProps {
  /** Route to open in a new tab, e.g. "/areas?new=1" */
  createPath: string;
  /** Query keys to invalidate when the user returns to this tab. */
  invalidateKeys: QueryKey[];
  title?: string;
  className?: string;
  /** Optional: called when the user returns (after invalidation) — e.g. to
   *  re-open/refocus something. */
  onReturn?: () => void;
}

export function InlineCreateButton({
  createPath,
  invalidateKeys,
  title = "Create new (opens in a new tab)",
  className,
  onReturn,
}: InlineCreateButtonProps) {
  const qc = useQueryClient();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Opens the create page in a new tab and, on return, invalidates the lists
    // so the freshly-created record is selectable without a reload.
    openCreateTab(createPath, qc, invalidateKeys, onReturn);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6 shrink-0 text-primary hover:text-primary", className)}
      title={title}
      onClick={handleClick}
      tabIndex={-1}
    >
      <Plus className="h-3.5 w-3.5" />
    </Button>
  );
}

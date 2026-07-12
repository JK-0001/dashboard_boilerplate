import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * `striped` — opt-in for list tables: alternating row background + bold text on
 * the tinted rows so adjacent records are easy to tell apart. Leave it off for
 * dense in-form entry tables (invoice item rows, allocation tables, etc.).
 */
interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  striped?: boolean;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, striped, ...props }, ref) => (
    // NOTE: no `overflow-auto` here — it would establish a scroll container that
    // traps the sticky table header. The scroll happens on the page or on a
    // bounded-height wrapper the page provides, so `position: sticky` on the
    // header bubbles up to that scroller and stays pinned.
    <div className="relative w-full">
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom text-[13px]",
          striped &&
            // Force every body cell — and its text-bearing children (span/p/div) —
            // to the same solid foreground color so columns that used
            // text-muted-foreground don't look washed-out next to others.
            // (<a> links and SVG icons keep their own color.)
            "[&_tbody_td]:text-foreground [&_tbody_td_span]:text-foreground [&_tbody_td_p]:text-foreground [&_tbody_td_div]:text-foreground " +
            // Bold the tinted (even) rows — target the td + its text children so a
            // cell's own font-medium (e.g. the Name column) doesn't override it.
            "[&_tbody_tr:nth-child(even)]:bg-muted/60 [&_tbody_tr:nth-child(even)_td]:font-semibold [&_tbody_tr:nth-child(even)_td_span]:font-semibold [&_tbody_tr:nth-child(even)_td_p]:font-semibold",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

// Distinct header: opaque dark-warm background + bold text, tighter height,
// and sticky so it stays pinned while the table body scrolls.
const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "sticky top-0 z-20 h-9 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-foreground bg-[hsl(var(--table-header))] [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-3 py-2 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };

import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

interface Props {
  rows?: number;
  columns: number;
}

/**
 * Renders shimmer rows that match an existing <Table> grid.
 * Use inside <TableBody> while data is loading.
 */
export function SkeletonRows({ rows = 6, columns }: Props) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <TableCell key={c} className="py-3">
              <Skeleton
                className="h-4"
                style={{ width: `${40 + ((r * 7 + c * 13) % 50)}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

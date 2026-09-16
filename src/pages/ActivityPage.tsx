/**
 * Activity — the filterable "who did what" feed. Read-only by design.
 * Facets (user/action/entity) build themselves from the data via
 * ColumnFilter; time range via DateRangeFilter.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SkeletonRows } from "@/components/ui/skeleton-table";
import { ColumnFilter } from "@/components/ColumnFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { DateRangeFilter, type DateRangeValue } from "@/components/DateRangeFilter";
import { useListSearch, type SearchColumn } from "@/hooks/useListSearch";
import { useHotkeys } from "@/hooks/useHotkeys";
import { activityApi, ACTIVITY_ACTION_META, type ActivityRow } from "@/lib/activityLog";
import { dateInRange, localToday } from "@/lib/dateRange";
import { statusMeta } from "@/lib/status";
import { fmtDate, timeAgo } from "@/lib/format";

export default function ActivityPage() {
  const [range, setRange] = useState<DateRangeValue>({ key: "all" });
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: activityApi.list,
  });

  const dateFiltered = useMemo(
    () => rows.filter((r) => dateInRange(r.at, range.key, localToday(), range.from, range.to)),
    [rows, range],
  );

  const columns: SearchColumn<ActivityRow>[] = useMemo(
    () => [
      { key: "user",    get: (r) => r.user },
      { key: "action",  get: (r) => ACTIVITY_ACTION_META[r.action].label },
      { key: "entity",  get: (r) => r.entity_type },
      { key: "summary", get: (r) => r.summary },
      { key: "at",      get: (r) => fmtDate(r.at), hidden: true },
    ],
    [],
  );
  const search = useListSearch(dateFiltered, columns);
  const { filtered } = search;

  useHotkeys({
    "/": (e) => {
      e.preventDefault();
      document.getElementById("activity-search")?.focus();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} event{filtered.length === 1 ? "" : "s"} · read-only audit trail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} />
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="activity-search"
              className="pl-8 w-52"
              placeholder="Search all fields… (press /)"
              value={search.global}
              onChange={(e) => search.setGlobal(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-y-auto h-[calc(100vh-200px)]">
            <Table striped>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      User
                      <ColumnFilter colKey="user" search={search} />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Action
                      <ColumnFilter colKey="action" search={search} />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Entity
                      <ColumnFilter colKey="entity" search={search} />
                    </div>
                  </TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows rows={6} columns={5} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ActivityIcon className="h-8 w-8" />
                        <p className="text-sm">
                          {search.anyActive ? "No events match your filters." : "No activity yet."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-muted-foreground" title={fmtDate(r.at)}>
                        {timeAgo(r.at)}
                      </TableCell>
                      <TableCell className="font-medium">{r.user}</TableCell>
                      <TableCell>
                        <StatusBadge meta={statusMeta(ACTIVITY_ACTION_META, r.action)} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.entity_type}</TableCell>
                      <TableCell className="text-sm">{r.summary}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

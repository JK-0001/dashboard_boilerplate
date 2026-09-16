/**
 * DateRangeFilter — toolbar dropdown of rolling ranges + custom from/to.
 * Custom inputs keep their values when flipping between presets.
 *
 *   const [range, setRange] = useState<DateRangeValue>({ key: "all" });
 *   const rows = useMemo(() => all.filter((r) =>
 *     dateInRange(r.created_at, range.key, localToday(), range.from, range.to)),
 *     [all, range]);
 *   <DateRangeFilter value={range} onChange={setRange} />
 */
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateInput } from "@/components/DateInput";
import { DATE_RANGE_OPTIONS, type TimeRangeKey } from "@/lib/dateRange";

export interface DateRangeValue {
  key: TimeRangeKey;
  from?: string; // YYYY-MM-DD, custom only
  to?: string;
}

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
}) {
  const current = DATE_RANGE_OPTIONS.find((o) => o.key === value.key);
  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {current?.label ?? "All Time"}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {DATE_RANGE_OPTIONS.map((o) => (
            <DropdownMenuItem key={o.key} onClick={() => onChange({ ...value, key: o.key })}>
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {value.key === "custom" && (
        <>
          <div className="w-32">
            <DateInput value={value.from ?? ""} onChange={(v) => onChange({ ...value, from: v })} />
          </div>
          <span className="text-xs text-muted-foreground">to</span>
          <div className="w-32">
            <DateInput value={value.to ?? ""} onChange={(v) => onChange({ ...value, to: v })} />
          </div>
        </>
      )}
    </div>
  );
}

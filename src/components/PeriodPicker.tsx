/**
 * PeriodPicker — the top-bar dropdown that sets the app-global reporting
 * period (see PeriodContext). Styled for the dark chrome.
 */
import { CalendarRange, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PERIOD_PRESETS, usePeriod } from "@/contexts/PeriodContext";

export function PeriodPicker() {
  const { period, setPeriod } = usePeriod();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-sidebar-border bg-transparent text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          title="Reporting period"
        >
          <CalendarRange className="h-3.5 w-3.5" />
          {period.label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {PERIOD_PRESETS.map((p) => (
          <DropdownMenuItem key={p.key} onClick={() => setPeriod({ ...p.range(), label: p.label })}>
            {p.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

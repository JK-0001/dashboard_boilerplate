/**
 * StatusBadge — the only way statuses render in tables/widgets.
 * Colour comes from the tone registry (src/lib/status.ts), never ad-hoc.
 *
 *   <StatusBadge meta={statusMeta(PRODUCT_STATUS, p.status)} />
 */
import { Badge } from "@/components/ui/badge";
import { TONE_BADGE, type StatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusBadge({ meta, className }: { meta: StatusMeta; className?: string }) {
  return (
    <Badge variant="outline" className={cn("text-[10px]", TONE_BADGE[meta.tone], className)}>
      {meta.label}
    </Badge>
  );
}

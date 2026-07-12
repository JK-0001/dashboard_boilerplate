/**
 * CommandPalette — ⌘K launcher: recents → quick-creates → all routes.
 *
 * To add live entity search (customers, items, …): add a CommandGroup that
 * runs a react-query fetch with `enabled: open`, `staleTime: 30_000`, and
 * navigates to the entity's list page with an id param on select.
 */
import { useRouter } from "next/router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useRecentRoutes } from "@/hooks/useRecentRoutes";
import { ALL_ROUTES, QUICK_ACTIONS } from "@/lib/nav";
import { Clock, Plus } from "lucide-react";
import { useState } from "react";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const { recents } = useRecentRoutes();
  const [query, setQuery] = useState("");

  const go = (to: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(to);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or page…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {query === "" && recents.length > 0 && (
          <>
            <CommandGroup heading="Recently visited">
              {recents.slice(0, 5).map((r) => (
                <CommandItem key={r.path} value={`recent-${r.label}`} onSelect={() => go(r.path)}>
                  <Clock className="mr-2 h-4 w-4" />
                  {r.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Create">
          {QUICK_ACTIONS.map((a) => (
            <CommandItem key={a.to} value={`create-${a.label}`} onSelect={() => go(a.to)}>
              <Plus className="mr-2 h-4 w-4" />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading="Go to">
          {ALL_ROUTES.map((r) => (
            <CommandItem key={r.to} value={`goto-${r.label}`} onSelect={() => go(r.to)}>
              <r.icon className="mr-2 h-4 w-4" />
              {r.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

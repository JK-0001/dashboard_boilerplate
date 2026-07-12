/**
 * NotificationsBell — top-bar bell with unread badge + popover list.
 *
 * DEMO DATA: notifications are local state here. Wire `useNotifications()`
 * to your backend (fetch + realtime) and keep the markup — the recipe
 * (badge button, popover header, unread tint, mark-all-read) is the pattern.
 */
import { useState } from "react";
import { useRouter } from "next/router";
import { formatDistanceToNow } from "date-fns";
import { BellRing, CheckCheck, ClipboardList, Dot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body?: string;
  link?: string;
  read_at: string | null;
  created_at: string;
};

/** Replace with a real hook (fetch + realtime subscription + mutations). */
function useNotifications() {
  const [items, setItems] = useState<Notification[]>([
    {
      id: "n1",
      title: "Welcome to your new dashboard",
      body: "This bell is a demo — wire it to your notifications table.",
      link: "/settings",
      read_at: null,
      created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    },
    {
      id: "n2",
      title: "Products page is the CRUD template",
      body: "Duplicate it for every new entity in your project.",
      link: "/products",
      read_at: null,
      created_at: new Date(Date.now() - 60 * 60_000).toISOString(),
    },
  ]);
  const markRead = (id: string) =>
    setItems((p) => p.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  const markAllRead = () =>
    setItems((p) => p.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  return { items, markRead, markAllRead };
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { items, markRead, markAllRead } = useNotifications();
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-8 px-2 border-sidebar-border bg-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          title={`${unread} unread notification${unread === 1 ? "" : "s"}`}
        >
          <BellRing className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground p-6 text-center">
              You&apos;re all caught up. 🎉
            </p>
          ) : (
            items.slice(0, 20).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  if (n.link) {
                    setOpen(false);
                    router.push(n.link);
                  }
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors flex gap-2",
                  !n.read_at && "bg-primary/5",
                )}
              >
                <ClipboardList className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center">
                    {!n.read_at && <Dot className="h-4 w-4 -ml-1 text-primary shrink-0" />}
                    <p className={cn("text-sm truncate", !n.read_at && "font-medium")}>{n.title}</p>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

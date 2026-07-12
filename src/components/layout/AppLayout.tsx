/**
 * AppLayout — the shell: fixed dark sidebar + fixed dark top bar + main region.
 * Sidebar is a hover-expanding rail; the pin button keeps it open (persisted).
 * Ctrl/Cmd+K opens the command palette; ?ref=dash pages support Backspace-back.
 */
import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/router";
import { AppSidebar } from "./AppSidebar";
import { NavLink } from "@/components/NavLink";
import { useBackNavigation } from "@/hooks/useFormShortcuts";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationsBell } from "@/components/NotificationsBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useTrackRecentRoutes } from "@/hooks/useRecentRoutes";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { TOP_NAV } from "@/lib/nav";
import { STORAGE_PREFIX } from "@/lib/appConfig";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_ENABLED } from "@/lib/supabase";

const PIN_KEY = `${STORAGE_PREFIX}_sidebar_pinned`;

export function AppLayout({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const router = useRouter();
  const { user, signOut } = useAuth();
  useTrackRecentRoutes();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  // Backspace returns to the Dashboard when the user drilled in from a KPI card
  // (those links carry ?ref=dash). Ignored while typing in an input/textarea.
  const cameFromDashboard = router.query.ref === "dash";
  useBackNavigation(() => router.push("/"), cameFromDashboard);

  // Restore the pinned preference on mount (client-only).
  useEffect(() => {
    try { setPinned(localStorage.getItem(PIN_KEY) === "1"); } catch { /* ignore */ }
  }, []);
  const togglePinned = () => {
    setPinned((p) => {
      const next = !p;
      try { localStorage.setItem(PIN_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  // Offsets depend on whether the sidebar is pinned-open (w-56) or a rail (w-14).
  const offsetLeft = pinned ? "left-56" : "left-14";
  const offsetMl   = pinned ? "ml-56" : "ml-14";

  useHotkeys({
    "ctrl+k": (e) => { e.preventDefault(); setPaletteOpen((o) => !o); },
  });

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        pinned={pinned}
        userEmail={user?.email ?? null}
        onSignOut={AUTH_ENABLED ? handleSignOut : undefined}
      />

      {/* ── Single top bar: pin · nav links · (spacer) · bell · theme · search ── */}
      <header className={cn("fixed top-0 right-0 z-20 h-14 border-b border-sidebar-border bg-sidebar text-sidebar-foreground flex items-center gap-2 px-3 transition-[left] duration-200", offsetLeft)}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={togglePinned}
          title={pinned ? "Collapse sidebar to icons (hover to expand)" : "Keep sidebar open"}
        >
          {pinned ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>

        <div className="h-5 w-px bg-sidebar-border" />

        <nav className="flex items-center gap-1">
          {TOP_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <NotificationsBell />
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPaletteOpen(true)}
          className="h-8 gap-2 border-sidebar-border bg-transparent text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <SearchIcon className="h-3.5 w-3.5" />
          Search…
          <kbd className="ml-1 rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-mono text-sidebar-foreground/80">⌘K</kbd>
        </Button>
      </header>

      {/* fixed h-14 bar → start content just below it */}
      <main className={cn("flex-1 p-6 pt-16 transition-[margin] duration-200", offsetMl)}>
        {children}
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

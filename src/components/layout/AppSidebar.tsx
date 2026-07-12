/**
 * AppSidebar — fixed dark left rail that hover-expands (56px ↔ 224px).
 * Nav structure comes from src/lib/nav.ts; brand from src/lib/appConfig.ts.
 * Per-group open state persists to localStorage. `pinned` is owned by AppLayout.
 */
import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS, FOOTER_NAV, type NavGroup, type NavItem } from "@/lib/nav";
import { APP_NAME, APP_ICON, STORAGE_PREFIX } from "@/lib/appConfig";

/** Flatten a group's items (covers both flat groups and ones with subgroups). */
function allItemsOf(group: NavGroup): NavItem[] {
  if (group.items) return group.items;
  return (group.subgroups ?? []).flatMap((s) => s.items);
}

const STORAGE_KEY = `${STORAGE_PREFIX}_sidebar_open`;

function loadOpenState(): Record<string, boolean> {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return Object.fromEntries(NAV_GROUPS.map((g) => [g.key, true]));
}

function NavItemLink({ item, expanded }: { item: NavItem; expanded: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      title={item.label}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md py-1.5 text-sm font-medium transition-colors",
          expanded ? "px-3" : "px-0 justify-center",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {expanded && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

export function AppSidebar({
  pinned = false,
  userEmail,
  onSignOut,
}: {
  pinned?: boolean;
  /** Shown in the footer when provided (wire to your auth). */
  userEmail?: string | null;
  /** Renders a sign-out button when provided (wire to your auth). */
  onSignOut?: () => void;
}) {
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(loadOpenState);
  const [hovered, setHovered] = useState(false);
  // Accordion for subgroups: only one open at a time.
  const [openSub, setOpenSub] = useState<string>(
    NAV_GROUPS.find((g) => g.subgroups)?.subgroups?.[0]?.key ?? "",
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  const toggleGroup = (key: string) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));
  const toggleSub = (key: string) => setOpenSub((cur) => (cur === key ? "" : key));

  // expanded = showing labels: always when pinned, otherwise only while hovered.
  const expanded = pinned || hovered;
  const BrandIcon = APP_ICON;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200",
        expanded ? "w-56" : "w-14",
        // Only float a shadow when temporarily overlaying (hover, not pinned).
        expanded && !pinned && "shadow-2xl",
      )}
    >
      {/* Brand */}
      <div className={cn("flex h-14 items-center gap-2 border-b border-sidebar-border", expanded ? "px-4" : "justify-center px-0")}>
        <BrandIcon className="h-6 w-6 shrink-0 text-sidebar-primary" />
        {expanded && (
          <span className="font-display text-lg font-bold tracking-tight text-sidebar-primary truncate">
            {APP_NAME}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-3 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {NAV_GROUPS.map((group) => {
          const open = openGroups[group.key] ?? true;
          const isActiveTo = (to: string) =>
            to === "/" ? router.pathname === "/" : router.pathname.startsWith(to);
          const hasActive = allItemsOf(group).some((i) => isActiveTo(i.to));
          // When collapsed (rail), always show item icons (ignore per-group open).
          const showItems = expanded ? open : true;
          return (
            <div key={group.key}>
              {expanded ? (
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                    hasActive && !open ? "text-sidebar-primary" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70",
                  )}
                >
                  {group.label}
                  <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open ? "rotate-0" : "-rotate-90")} />
                </button>
              ) : (
                <div className="mx-2 my-1 border-t border-sidebar-border/40" />
              )}

              {showItems && group.subgroups && (
                // Nested accordion (e.g. Records → Incoming / Outgoing).
                <div className={cn("mt-0.5 space-y-0.5", expanded && "pl-1")}>
                  {group.subgroups.map((sub) => {
                    const subOpen = expanded ? openSub === sub.key : true;
                    const subActive = sub.items.some((i) => isActiveTo(i.to));
                    return (
                      <div key={sub.key}>
                        {expanded && (
                          <button
                            onClick={() => toggleSub(sub.key)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-md pl-5 pr-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                              subActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80",
                            )}
                          >
                            {sub.label}
                            <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", subOpen ? "rotate-0" : "-rotate-90")} />
                          </button>
                        )}
                        {subOpen && (
                          <div className={cn("mt-0.5 space-y-0.5", expanded && "pl-3")}>
                            {sub.items.map((item) => (
                              <NavItemLink key={item.to} item={item} expanded={expanded} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {showItems && group.items && (
                <div className={cn("mt-0.5 space-y-0.5", expanded && "pl-1")}>
                  {group.items.map((item) => (
                    <NavItemLink key={item.to} item={item} expanded={expanded} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        <NavLink
          to={FOOTER_NAV.to}
          title={FOOTER_NAV.label}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors",
              expanded ? "px-3" : "px-0 justify-center",
              isActive
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )
          }
        >
          <FOOTER_NAV.icon className="h-4 w-4 shrink-0" />
          {expanded && FOOTER_NAV.label}
        </NavLink>

        {(userEmail || onSignOut) && (
          <div className={cn("flex items-center gap-2 rounded-md py-2", expanded ? "px-3" : "px-0 justify-center")}>
            {expanded && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-sidebar-foreground/50 truncate">{userEmail}</p>
              </div>
            )}
            {onSignOut && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                onClick={onSignOut}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

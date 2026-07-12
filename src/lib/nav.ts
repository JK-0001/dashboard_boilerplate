/**
 * Navigation config — the single place to define your app's menu.
 * Consumed by AppSidebar (left rail), AppLayout (top nav), CommandPalette
 * ("Go to" + "Create"), and useRecentRoutes (labels).
 *
 * Structure: groups → optional subgroups → items. Icons are lucide-react.
 */
import {
  LayoutDashboard,
  Package,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon };
export type SubGroup = { key: string; label: string; items: NavItem[] };
export type NavGroup = { key: string; label: string; items?: NavItem[]; subgroups?: SubGroup[] };

/** Sidebar groups. Add your entities here — one line per page. */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "masters",
    label: "Masters",
    items: [
      { to: "/products", label: "Products", icon: Package },
      // { to: "/customers", label: "Customers", icon: Users },
    ],
  },
  // Subgroups (accordion) are supported too:
  // {
  //   key: "records",
  //   label: "Records",
  //   subgroups: [
  //     { key: "in",  label: "Incoming", items: [...] },
  //     { key: "out", label: "Outgoing", items: [...] },
  //   ],
  // },
];

/** Pills in the dark top bar, next to the sidebar pin. */
export const TOP_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
];

/** Footer link in the sidebar. */
export const FOOTER_NAV: NavItem = { to: "/settings", label: "Settings", icon: Settings };

/** Quick-create actions for the ⌘K palette (deep-link to ?new=1 forms). */
export const QUICK_ACTIONS: NavItem[] = [
  { to: "/products?new=1", label: "New Product", icon: Package },
];

/** Flat route → label map (recents tracking + palette "Go to"). */
export const ROUTE_LABELS: Record<string, string> = Object.fromEntries([
  ...TOP_NAV.map((i) => [i.to, i.label]),
  ...NAV_GROUPS.flatMap((g) => [
    ...(g.items ?? []).map((i) => [i.to, i.label]),
    ...(g.subgroups ?? []).flatMap((s) => s.items.map((i) => [i.to, i.label])),
  ]),
  [FOOTER_NAV.to, FOOTER_NAV.label],
]);

/** Every navigable route, for the palette's "Go to" group. */
export const ALL_ROUTES: NavItem[] = [
  ...TOP_NAV,
  ...NAV_GROUPS.flatMap((g) => [
    ...(g.items ?? []),
    ...(g.subgroups ?? []).flatMap((s) => s.items),
  ]),
  FOOTER_NAV,
];

/**
 * Roles & permissions — the static-map default (zero DB setup).
 *
 * Two vocabularies, deliberately separate (mined from poss_new/nlp_coach):
 *   - page.* permissions  = what a person can SEE (drive nav + RouteGuard)
 *   - action permissions  = what a person can DO (checked in handlers/UI)
 *
 * Three-layer discipline: hiding a nav item is courtesy, <RouteGuard> is the
 * sign on the door, the server/RLS is the lock (add `requirePermission()` on
 * API routes + a `has_permission()` SQL fn when you wire a real backend —
 * see docs/GENERALIZATION_AUDIT.md for the DB-driven upgrade path).
 *
 * Hard guarantees, enforced in resolvePermissions():
 *   - owner ALWAYS has every permission (can't lock yourself out)
 *   - an empty/invalid override falls back to role defaults, never to nothing
 */

export type Role = "owner" | "admin" | "manager" | "staff";
export const ROLES: Role[] = ["owner", "admin", "manager", "staff"];

export const PERMISSIONS = [
  // page visibility
  "page.dashboard",
  "page.products",
  "page.suppliers",
  "page.activity",
  "page.team",
  "page.settings",
  // actions
  "products.write",
  "products.delete",
  "suppliers.write",
  "suppliers.delete",
  "data.import",
  "data.export",
  "team.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Human labels for the Team page matrix. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "page.dashboard": "View dashboard",
  "page.products": "View products",
  "page.suppliers": "View suppliers",
  "page.activity": "View activity log",
  "page.team": "View team",
  "page.settings": "View settings",
  "products.write": "Create / edit products",
  "products.delete": "Delete products",
  "suppliers.write": "Create / edit suppliers",
  "suppliers.delete": "Delete suppliers",
  "data.import": "Import data",
  "data.export": "Export data",
  "team.manage": "Manage team & roles",
};

/** Role defaults. Per-tenant overrides (Team page) are layered on top. */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [...PERMISSIONS],
  admin: [...PERMISSIONS],
  manager: [
    "page.dashboard", "page.products", "page.suppliers", "page.activity", "page.settings",
    "products.write", "suppliers.write", "data.import", "data.export",
  ],
  staff: ["page.dashboard", "page.products", "page.suppliers", "products.write", "suppliers.write"],
};

/** Route → required page permission. Routes not listed are open to all. */
export const ROUTE_PERMISSION: Record<string, Permission> = {
  "/": "page.dashboard",
  "/products": "page.products",
  "/suppliers": "page.suppliers",
  "/activity": "page.activity",
  "/team": "page.team",
  "/settings": "page.settings",
};

export type RoleOverrides = Partial<Record<Role, Permission[]>>;

/** Resolve a role's effective permission set (defaults ← optional override). */
export function resolvePermissions(role: Role, overrides?: RoleOverrides): Set<Permission> {
  if (role === "owner") return new Set(PERMISSIONS); // owner keeps everything, always
  const override = overrides?.[role];
  const valid = override?.filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p));
  if (valid && valid.length > 0) return new Set(valid);
  return new Set(DEFAULT_ROLE_PERMISSIONS[role] ?? []);
}

/** Permission needed to open a path ("/products/x" matches "/products"). */
export function permissionForRoute(pathname: string): Permission | null {
  if (ROUTE_PERMISSION[pathname]) return ROUTE_PERMISSION[pathname];
  const base = Object.keys(ROUTE_PERMISSION)
    .filter((r) => r !== "/" && pathname.startsWith(r + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return base ? ROUTE_PERMISSION[base] : null;
}

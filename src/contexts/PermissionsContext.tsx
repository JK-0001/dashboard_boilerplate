/**
 * PermissionsProvider — resolves the current user's role into a permission
 * set and exposes `can()` / `canOpen()` to the whole app (nav, RouteGuard,
 * buttons).
 *
 * DEMO MODE: the acting role + role overrides live in localStorage so the
 * Team page can demonstrate gating live ("act as staff" → nav items vanish).
 * REAL BACKEND: replace `useActingRole` with a lookup of the signed-in
 * user's membership row (user_id → role, plus a role_permissions override
 * table), and enforce the same checks server-side.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { STORAGE_PREFIX } from "@/lib/appConfig";
import {
  resolvePermissions, permissionForRoute,
  type Permission, type Role, type RoleOverrides,
} from "@/lib/permissions";

const ROLE_KEY = `${STORAGE_PREFIX}_acting_role`;
const OVERRIDES_KEY = `${STORAGE_PREFIX}_role_overrides`;

interface PermissionsValue {
  role: Role;
  setRole: (r: Role) => void;
  overrides: RoleOverrides;
  setOverrides: (o: RoleOverrides) => void;
  can: (p: Permission) => boolean;
  canOpen: (pathname: string) => boolean;
}

const Ctx = createContext<PermissionsValue | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("owner");
  const [overrides, setOverridesState] = useState<RoleOverrides>({});

  useEffect(() => {
    try {
      const r = localStorage.getItem(ROLE_KEY) as Role | null;
      if (r) setRoleState(r);
      const o = localStorage.getItem(OVERRIDES_KEY);
      if (o) setOverridesState(JSON.parse(o));
    } catch { /* defaults stay */ }
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    try { localStorage.setItem(ROLE_KEY, r); } catch { /* ignore */ }
  };
  const setOverrides = (o: RoleOverrides) => {
    setOverridesState(o);
    try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o)); } catch { /* ignore */ }
  };

  const perms = resolvePermissions(role, overrides);
  const can = useCallback((p: Permission) => perms.has(p), [perms]);
  const canOpen = useCallback(
    (pathname: string) => {
      const needed = permissionForRoute(pathname);
      return needed ? perms.has(needed) : true;
    },
    [perms],
  );

  return (
    <Ctx.Provider value={{ role, setRole, overrides, setOverrides, can, canOpen }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePermissions(): PermissionsValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}

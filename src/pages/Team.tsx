/**
 * Team — members list + role assignment + the permission matrix.
 *
 * The matrix edits per-role permission OVERRIDES (layered over the code
 * defaults in src/lib/permissions.ts). Owner's column is locked — owners
 * always keep every permission so nobody can lock themselves out.
 *
 * DEMO: "Act as role" switches the whole app's acting role live so you can
 * watch nav items disappear and RouteGuard kick in. With a real backend the
 * acting role comes from the signed-in user's membership row instead.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SkeletonRows } from "@/components/ui/skeleton-table";
import { StatusBadge } from "@/components/StatusBadge";
import { usePermissions } from "@/contexts/PermissionsContext";
import {
  DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, PERMISSION_LABELS, ROLES,
  resolvePermissions, type Permission, type Role,
} from "@/lib/permissions";
import { teamApi, type TeamMember } from "@/lib/demoStore";
import { friendlyDbError } from "@/lib/dbErrors";
import { fmtDate } from "@/lib/format";
import type { StatusMeta } from "@/lib/status";

const ROLE_META: Record<Role, StatusMeta> = {
  owner: { label: "Owner", tone: "violet" },
  admin: { label: "Admin", tone: "info" },
  manager: { label: "Manager", tone: "cyan" },
  staff: { label: "Staff", tone: "neutral" },
};

export default function Team() {
  const qc = useQueryClient();
  const { role: actingRole, setRole, overrides, setOverrides, can } = usePermissions();
  const canManage = can("team.manage");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: teamApi.list,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => teamApi.setRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      toast.success("Role updated");
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  // Effective permission set per role (defaults ← overrides), for the matrix.
  const effective = useMemo(() => {
    const map = {} as Record<Role, Set<Permission>>;
    for (const r of ROLES) map[r] = resolvePermissions(r, overrides);
    return map;
  }, [overrides]);

  const togglePermission = (r: Role, p: Permission) => {
    if (r === "owner") return; // locked by design
    const cur = [...effective[r]];
    const next = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p];
    setOverrides({ ...overrides, [r]: next });
    toast.success(`${ROLE_META[r].label}: ${PERMISSION_LABELS[p]} ${cur.includes(p) ? "revoked" : "granted"}`);
  };

  const resetRole = (r: Role) => {
    const { [r]: _drop, ...rest } = overrides;
    setOverrides(rest);
    toast.success(`${ROLE_META[r].label} reset to defaults`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"} · roles &amp; permissions
          </p>
        </div>
        {/* Demo affordance: preview the app as another role */}
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Act as</span>
          <Select value={actingRole} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Members */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <Table striped>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-40">Change role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows rows={4} columns={5} />
              ) : (
                members.map((m: TeamMember) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                    <TableCell><StatusBadge meta={ROLE_META[m.role]} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(m.created_at)}</TableCell>
                    <TableCell>
                      <Select
                        value={m.role}
                        onValueChange={(v) => roleMutation.mutate({ id: m.id, role: v as Role })}
                        disabled={!canManage || m.role === "owner"}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permission matrix */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Permissions
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Owner is locked · changes apply instantly to the acting role
          </p>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r} className="text-center w-24">
                    <div className="flex flex-col items-center gap-1">
                      {ROLE_META[r].label}
                      {r !== "owner" && overrides[r] && (
                        <button
                          onClick={() => canManage && resetRole(r)}
                          className="text-[10px] font-normal normal-case tracking-normal text-primary hover:underline"
                        >
                          reset
                        </button>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map((p) => (
                <TableRow key={p}>
                  <TableCell className="text-sm">
                    {PERMISSION_LABELS[p]}
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">{p}</span>
                  </TableCell>
                  {ROLES.map((r) => (
                    <TableCell key={r} className="text-center">
                      <Checkbox
                        checked={effective[r].has(p)}
                        disabled={r === "owner" || !canManage}
                        onCheckedChange={() => togglePermission(r, p)}
                        aria-label={`${ROLE_META[r].label}: ${PERMISSION_LABELS[p]}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

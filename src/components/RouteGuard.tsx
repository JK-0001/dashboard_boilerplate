/**
 * RouteGuard — the "sign on the door". Renders a locked-door panel (naming
 * the missing permission) instead of the page when the acting role can't
 * open the current route. Nav hiding is courtesy; this catches deep links.
 * Server-side checks/RLS remain the real lock on a live backend.
 */
import { useRouter } from "next/router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/contexts/PermissionsContext";
import { permissionForRoute } from "@/lib/permissions";
import type { ReactNode } from "react";

export function RouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { canOpen, role } = usePermissions();

  if (canOpen(router.pathname)) return <>{children}</>;

  const needed = permissionForRoute(router.pathname);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <Lock className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-semibold">You don&apos;t have access to this page</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Your role (<span className="font-medium">{role}</span>) doesn&apos;t include{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">{needed}</code>.
        Ask an admin to grant it from the Team page.
      </p>
      <Button variant="outline" onClick={() => router.push("/")}>Go to Dashboard</Button>
    </div>
  );
}

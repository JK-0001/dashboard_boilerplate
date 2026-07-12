/**
 * Login — email/password sign-in on a centered brand card.
 * Rendered WITHOUT the AppLayout shell (see PUBLIC_PATHS in _app.tsx).
 */
import { useState } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_ENABLED } from "@/lib/supabase";
import { APP_NAME, APP_ICON } from "@/lib/appConfig";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const BrandIcon = APP_ICON;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Signed in");
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center space-y-2">
          <BrandIcon className="h-10 w-10 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          {!AUTH_ENABLED ? (
            <div className="grid gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                Auth is not configured. Set{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>{" "}
                and{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </code>{" "}
                (see .env.example) to enable sign-in.
              </p>
              <Button onClick={() => router.replace("/")}>Continue to Dashboard</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="mt-1" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

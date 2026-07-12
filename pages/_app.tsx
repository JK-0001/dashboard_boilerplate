/**
 * App root — provider tree:
 *   ErrorBoundary → QueryClient → next-themes → Tooltip → (Sonner) → Auth → Guard → AppLayout
 *
 * AUTH is env-gated (src/lib/supabase.ts): with no Supabase env vars the app
 * runs open; with them set, Guard redirects signed-out users to /login.
 */
import "@/styles/theme.css";
import "@/index.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AUTH_ENABLED } from "@/lib/supabase";
import { APP_NAME } from "@/lib/appConfig";

/** Routes rendered WITHOUT the shell (and accessible signed-out). */
const PUBLIC_PATHS = ["/login"];

function Guard({ children, page }: { children: ReactNode; page: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const isPublic = PUBLIC_PATHS.includes(router.pathname);

  useEffect(() => {
    if (!AUTH_ENABLED || loading) return;
    if (!user && !isPublic) router.replace("/login");
    if (user && isPublic) router.replace("/");
  }, [user, loading, isPublic, router]);

  // Public pages (login) render bare — no sidebar/header.
  if (isPublic) return <>{page}</>;
  // Hold rendering until the session is known / redirect fires.
  if (AUTH_ENABLED && (loading || !user)) return null;
  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, staleTime: 60_000 },
        },
      }),
  );

  const page = <Component {...pageProps} />;

  return (
    <ErrorBoundary title="Application failed to load">
      <Head>
        <title>{APP_NAME}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <TooltipProvider>
            <Sonner />
            <AuthProvider>
              <Guard page={page}>
                <AppLayout>
                  <ErrorBoundary>{page}</ErrorBoundary>
                </AppLayout>
              </Guard>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

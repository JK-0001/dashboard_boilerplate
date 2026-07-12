/**
 * App root — provider tree:
 *   ErrorBoundary → QueryClient → next-themes → Tooltip → (Sonner) → AppLayout
 *
 * AUTH: this boilerplate ships without auth. To add it, wrap AppLayout in a
 * Guard that redirects to /login for unauthenticated users (keep /login in a
 * PUBLIC_PATHS list and render <Component/> bare for those paths).
 */
import "@/styles/theme.css";
import "@/index.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { APP_NAME } from "@/lib/appConfig";

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, staleTime: 60_000 },
        },
      }),
  );

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
            <AppLayout>
              <ErrorBoundary>
                <Component {...pageProps} />
              </ErrorBoundary>
            </AppLayout>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

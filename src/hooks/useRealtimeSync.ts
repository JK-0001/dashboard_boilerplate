/**
 * Live sync across windows and users.
 *
 * Subscribes to Postgres change events (INSERT / UPDATE / DELETE) for the
 * whole schema via Supabase Realtime. On any change — whether made in another
 * browser tab or by a different user — it invalidates the React Query caches
 * so every open screen refreshes automatically, no manual reload needed.
 * Changes are debounced so a burst of edits triggers a single refresh.
 *
 * Inert when Supabase isn't configured (demo mode) — safe to mount always.
 *
 * Requires the relevant tables to be in the `supabase_realtime` publication:
 *   alter publication supabase_realtime add table your_table;
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const SCHEMA = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "public";

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!supabase) return; // demo mode — nothing to subscribe to

    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => queryClient.invalidateQueries(), 300);
    };

    const channel = supabase
      .channel("app-db-sync")
      .on("postgres_changes", { event: "*", schema: SCHEMA }, refresh)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase?.removeChannel(channel);
    };
  }, [queryClient]);
}

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { ROUTE_LABELS } from "@/lib/nav";
import { STORAGE_PREFIX } from "@/lib/appConfig";

const KEY = `${STORAGE_PREFIX}_recent_routes`;
const MAX = 8;

export type RecentRoute = { path: string; label: string; visitedAt: number };

function load(): RecentRoute[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list: RecentRoute[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

/** Tracks the current route into a "recently visited" list (excluding /login). */
export function useTrackRecentRoutes() {
  const { pathname } = useRouter();
  useEffect(() => {
    const path = pathname;
    if (path === "/login" || path.startsWith("/auth")) return;
    const label = ROUTE_LABELS[path];
    if (!label) return; // only track known top-level pages
    const existing = load().filter((r) => r.path !== path);
    const next: RecentRoute[] = [
      { path, label, visitedAt: Date.now() },
      ...existing,
    ].slice(0, MAX);
    save(next);
  }, [pathname]);
}

export function useRecentRoutes() {
  const [list, setList] = useState<RecentRoute[]>(load);
  const refresh = useCallback(() => setList(load()), []);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);
  return { recents: list, refresh };
}

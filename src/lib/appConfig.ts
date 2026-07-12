/**
 * App identity — edit these per project (along with src/styles/theme.css
 * and src/lib/nav.ts; nothing else should need touching for a re-brand).
 */
import { Package } from "lucide-react";

/** Shown in the sidebar brand block, browser title, exports, etc. */
export const APP_NAME = "Acme Dashboard";

/** Brand icon (lucide) shown next to the app name in the sidebar. */
export const APP_ICON = Package;

/** Locale + symbol used by every money formatter in src/lib/format.ts. */
export const CURRENCY = {
  locale: "en-IN" as const,
  symbol: "₹",
};

/** localStorage key prefix (drafts, sidebar state, recents). */
export const STORAGE_PREFIX = "app";

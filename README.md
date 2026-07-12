# Dashboard Boilerplate

A production-grade dashboard starter with a complete, opinionated UI/UX system:
warm design tokens, an always-dark chrome (sidebar + header), keyboard-first
CRUD, striped sticky tables with clickable rows, centered modal forms, and
colour-coded toasts. **Start a new project by changing one theme file and the
nav config — everything else is already decided.**

Stack: **Next.js (Pages Router) · Tailwind CSS 3 · shadcn/ui (Radix) ·
lucide-react · TanStack Query · Sonner · next-themes**.

The full design-system rationale lives in `docs/UI_BOILERPLATE.md` of the
source project (spicebooks); this repo is its executable form.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 — Dashboard, a Products CRUD demo (in-memory data),
and Settings. Try: hover the sidebar rail, pin it, press `Ctrl/⌘+K`, press `/`
on Products, click a row, press `F2` inside the form, half-fill a new product
and reopen it (draft restore), delete a row (red toast), toggle dark mode.

## Start a new project (the 4-file re-brand)

| File | What to change |
|---|---|
| `src/styles/theme.css` | **The only styling file you touch.** Swap the hues, keep the lightness/saturation (recipe is commented at the top). Light + dark palettes. |
| `src/lib/appConfig.ts` | App name, brand icon, currency locale/symbol, storage prefix. |
| `src/lib/nav.ts` | Sidebar groups (subgroups supported), top-bar pills, ⌘K quick-creates. One config drives all three. |
| `src/lib/demoStore.ts` | **Replace with your real data layer** (Supabase / REST / tRPC). Keep the promise-returning function shapes and the pages don't change. |

Everything else — layout, tables, modals, toasts, shortcuts, empty states,
loading states, exports — stays untouched so every project looks and behaves
identically.

## Adding an entity (the CRUD recipe)

1. Duplicate `src/pages/Products.tsx` → `src/pages/Customers.tsx`.
2. Change the type, columns array, form fields, and API calls.
3. Add a one-line wrapper `pages/customers.tsx`:
   `export { default } from "@/pages/Customers";`
4. Add one line to `NAV_GROUPS` (and optionally `QUICK_ACTIONS`) in `src/lib/nav.ts`.

The template already includes: clickable rows → edit modal, popup-modal
create/edit (the centered Sheet), AlertDialog delete confirm + red toast,
global search with `/` hotkey, per-column funnel filters, CSV/Excel/PDF
export, F2 save, localStorage drafts for new records, `?new=1` deep links,
skeleton loading, and filter-aware empty states.

## Non-negotiable conventions (what keeps every app consistent)

- **Icons:** lucide-react only. Leading button icon `mr-2 h-4 w-4`; row
  actions `h-3.5 w-3.5` in `h-7 w-7` ghost buttons.
- **Fonts:** DM Sans everywhere; Space Grotesk (`font-display`) only for page
  titles, brand, and big numbers.
- **Tables:** `<Table striped>` inside `Card > CardContent p-0` with a bounded
  `overflow-y-auto h-[calc(100vh-200px)]` scroller. Numbers right-aligned
  `font-mono`. Whole row clickable; actions cell calls `stopPropagation`.
- **Modals:** forms open in the customized `Sheet` (a centered `w-[64rem]`
  modal). It is deliberately **transform-free** — do not re-add slide/translate
  animations or the fixed-position combobox dropdowns will anchor wrong.
  Small quick-creates/detail views use `Dialog` (`max-h-[85vh] overflow-y-auto`
  when tall).
- **Toasts (Sonner):** `toast.success` on create/update, **`toast.error` on
  delete** (red = something destructive happened), `toast.warning` for soft
  rules. Close ✕ top-right; clicking anywhere else dismisses.
- **Validation:** manual checks at submit → `toast.error(...)` and return.
  DB errors go through `friendlyDbError()`.
- **Formatting:** only via `src/lib/format.ts` (`fmtMoney`, `fmtAmt`,
  `fmtDate`, …) — never inline `toLocaleString` in pages.
- **Status colours:** emerald = success, red = error/overdue, amber = warning/
  pending, blue = info, slate = neutral (with `dark:bg-<c>-950/20
  dark:text-<c>-400` dark variants).
- **Scrollbars** are hidden globally (scrolling still works). Keyboard map:
  `⌘K` palette, `/` search, `F2` save, `Esc` close, `Enter` advances fields in
  multi-field entry flows.

## Adding auth

`pages/_app.tsx` has a marked spot: wrap `<AppLayout>` in a Guard that
redirects unauthenticated users to `/login` (keep `/login` in a
`PUBLIC_PATHS` list rendered without the shell). Pass `userEmail` / `onSignOut`
to `<AppSidebar>` to light up the footer account row.

## Optional patterns to port from spicebooks when needed

- **Line-item entry tables** (invoice rows with Enter-to-advance ids and the
  inline "Add another?" prompt) — see spicebooks `src/pages/Sales.tsx`.
- **Report registry + drill-down** (`?view=` URLs, `DrillCtx`, print) — see
  spicebooks `src/pages/Reports.tsx`.
- **Stars/bookmarks, realtime sync, WhatsApp/chat** — feature-specific, copy
  when the project calls for them.

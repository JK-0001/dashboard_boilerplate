# CLAUDE.md — read this before touching any file

This is an **opinionated dashboard boilerplate**. Every UI/UX decision is
already made and locked. Your job is business logic and new entities — never
redesign, restyle, or "improve" the UI. If you follow the recipes below, the
result is guaranteed to look right.

## The four files you may customize per project

| File | What it controls |
|---|---|
| `src/styles/theme.css` | ALL colors (light + dark). Re-brand = swap hues here, nothing else. |
| `src/lib/appConfig.ts` | App name, brand icon, currency locale/symbol. |
| `src/lib/nav.ts` | Sidebar groups, top-bar pills, ⌘K quick-creates — one config drives all three. |
| `src/lib/demoStore.ts` | Fake in-memory API. Replace with the real backend, keep the promise-returning shapes. |

Everything else (layout shell, table system, modal system, toasts, shortcuts)
is shared infrastructure — treat it as read-only unless fixing a bug.

## Recipe: add a new entity (the main task you'll be asked to do)

`src/pages/Products.tsx` is the canonical CRUD template. To add e.g. Customers:

1. **Data**: add a `Customer` type + `customerApi = { list, create, update,
   remove, removeMany, updateMany }` to `src/lib/demoStore.ts` (or the real
   API module), mirroring `productApi`. Seed ~10 realistic demo rows.
2. **Page**: copy `src/pages/Products.tsx` → `src/pages/Customers.tsx`. Change
   only: the type, the form fields, the table columns, the search columns, the
   export columns, the STATUS map, and the API calls. Keep every structural
   pattern (see conventions below).
3. **Route**: create `pages/customers.tsx` containing exactly:
   `export { default } from "@/pages/Customers";`
4. **Nav**: add one item to `NAV_GROUPS` in `src/lib/nav.ts` (and optionally
   one to `QUICK_ACTIONS` for the ⌘K "Create" group). Pick a lucide icon.
5. **Verify**: `npm run build` must pass. If a dev server is available, open
   the page: list renders, row click opens the edit modal, create/delete work.

Do NOT invent a different page structure, a different modal flavor, or a
different table layout. Duplication of the template is the intended design.

## Non-negotiable conventions

**Icons** — `lucide-react` ONLY. Never emoji-as-icons, never other icon packs,
never inline SVG icons. Sizes: leading button icon `mr-2 h-4 w-4`; row-action
icons `h-3.5 w-3.5` inside `h-7 w-7` ghost buttons; compact hints `h-3 w-3`.

**Colors** — only theme tokens (`bg-primary`, `text-muted-foreground`, …) or
the semantic status palette below. Never hardcode hex/rgb, never pick new
Tailwind colors outside these:
- success/connected → emerald (`bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800`)
- warning/pending → amber (same pattern)
- error/overdue → red (same pattern)
- info/medium → blue (same pattern)
- neutral/low/inactive → slate (same pattern)

**Typography** — body text inherits DM Sans. `font-display` (Space Grotesk) is
ONLY for: page `<h1>` (`font-display text-2xl font-bold tracking-tight`),
brand, and big KPI numbers. Amounts/refs are `font-mono`, right-aligned.

**Page skeleton** — every page: root `<div className="space-y-6">`, header row
`flex items-center justify-between` with h1 + subtitle
(`text-sm text-muted-foreground`, include a live count/total), toolbar on the
right: search input (`pl-8 w-52`, `/` hotkey focuses it) → `<ExportMenu>` →
primary `<Button><Plus className="mr-2 h-4 w-4" />New X</Button>`.

**Tables** — `<Table striped>` inside `<Card><CardContent className="p-0
overflow-hidden">` with a bounded scroller `<div className="overflow-y-auto
h-[calc(100vh-200px)]">`. No pagination — ever. Whole row is clickable
(`className="cursor-pointer"` + `onClick={openEdit}`); the trailing actions
cell calls `e.stopPropagation()`. Numbers `text-right font-mono`. Empty cells
show `—`. Status columns use `<Badge variant="outline"
className="text-[10px] …semantic palette…">`. Column filters via
`<ColumnFilter colKey search={search} />` inside the `<TableHead>`.

**Forms & modals** — create/edit ALWAYS opens in the `<Sheet>` (a centered
modal, not a drawer). Form recipe: `<form className="grid gap-5 py-4">`,
field rows `grid grid-cols-2 gap-4`, each field `grid gap-2` with `<Label>`;
required fields = literal ` *` appended to the label text. Submit button:
`disabled={mutation.isPending}` with label swap to `"Saving…"`. Wire
`useFormDraft` (new records only) and F2-to-save (`onKeyDown` for F2 on
SheetContent). Support `?new=1` auto-open. Small read-only detail views may
use `<Dialog>` (`max-h-[85vh] overflow-y-auto` when tall).
⚠️ NEVER add translate/slide animations to `ui/sheet.tsx` — the fixed-position
combobox dropdowns depend on the modal being transform-free.

**Bulk actions** — every list table has a leading checkbox column driven by
`useBatchSelection(filtered)` (selection over the filtered rows): header
`<Checkbox>` in a `w-10` head = select all / none (`"indeterminate"` when
partial); each row's checkbox cell calls `e.stopPropagation()` so ticking
never opens the edit modal. While ≥1 row is selected, render the selection
bar above the table card: `flex items-center gap-2 rounded-md border
bg-muted/40 px-3 py-2` containing "{n} selected", a "Set status" outline-sm
DropdownMenu (bulk update via `xApi.updateMany` → `toast.success`), a Delete
outline-sm button with `text-destructive` (AlertDialog "Delete {n} xs?"
confirm → `xApi.removeMany` → red `toast.error("{n} xs deleted")`), and a
ghost "Clear". Remember: adding the checkbox column changes the table's
column count — update `SkeletonRows columns` and empty-state `colSpan`.

**Deletes** — always `<AlertDialog>` confirm (title "Delete {name}?",
consequence sentence, Cancel + primary "Delete" action), triggered by a ghost
`Trash2` button with `text-destructive`. After deletion fire
`toast.error("X deleted")` — red toast on delete is the house convention.

**Toasts** — `import { toast } from "sonner"` only. `toast.success` on
create/update, `toast.error` for validation failures AND deletions,
`toast.warning` for soft rules. Never use any other toast/notification lib.

**Validation** — manual checks at the top of `handleSubmit`, each failure:
`toast.error("message"); return;`. No zod/react-hook-form. DB/API errors:
`onError: (e) => toast.error(friendlyDbError(e))`.

**Formatting** — ONLY via `src/lib/format.ts` (`fmtMoney`, `fmtAmt`,
`fmtAmtOrDash`, `fmtQty`, `fmtDate`, `fmtDateShort`). Never inline
`toLocaleString`/date formatting in pages.

**Data fetching** — TanStack Query. Lists: `useQuery({ queryKey: ["xs"],
queryFn: xApi.list })`. Mutations invalidate the list key in `onSuccess`.
No other data libs, no useEffect-fetching, no optimistic updates.

**Loading & empty states** — table loading = `<SkeletonRows rows={6}
columns={N} />`. Empty state = icon + message row distinguishing "no data yet"
vs "no match for filters" via `search.anyActive`. Buttons never get spinners;
they disable + swap label (icon-only buttons may swap to `Loader2
animate-spin`).

**Keyboard map (do not rebind)** — ⌘K palette · `/` focus search · F2 save
form · Esc close · Backspace back only from `?ref=dash` drill-downs.

## Never do

- Never install a UI/component/styling/icon/toast/form library. Everything
  needed exists in the repo.
- Never edit files in `src/components/ui/` except to fix a proven bug.
- Never hardcode colors, shadows, or radii; never add custom animations
  beyond `transition-colors` / `animate-pulse` / `animate-spin`.
- Never add pagination, horizontal page scroll, or visible scrollbars.
- Never put business copy in the shell (AppLayout/AppSidebar) — pages own
  their content.
- Never bypass `format.ts`, `dbErrors.ts`, or the toast conventions.

## Auth note

Auth is env-gated (`src/lib/supabase.ts`): no env vars → app runs open;
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set → `/login`
guard activates. Public (shell-less) routes are listed in `PUBLIC_PATHS` in
`pages/_app.tsx`.

## Verify your work

Run `npm run build` — it must pass with zero errors before you consider any
task done. For UI changes, load the affected page in the dev server
(`npm run dev`, port from the command) and exercise the flow you changed.

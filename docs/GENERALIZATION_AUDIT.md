# Generalization Audit — mined from 18 repos (2026-09-16)

A survey of every dashboard-style repo in `Documents\` (client work, demos,
SaaS products) to find features worth generalizing into this boilerplate.
Every candidate below was verified by reading the actual source file.

**Meta-finding:** `aa_fitness` is already a near-byte-identical clone of this
boilerplate (only appConfig/nav/theme/demoStore/entity pages differ) — the
4-file re-brand workflow is proven in production. `poss_new` and
`khatriautomations_nextjs_website` carry earlier copies of the same component
lineage (DataTable/ExportMenu/useListSearch/…) — do not re-port those.

Legend: repo paths are relative to `C:\Users\JATIN KHATRI\Documents\`.

---

## TIER 1 — build into the boilerplate core (universal, seen in 3+ repos)

### 1. Roles & permissions  ⭐ strongest signal — 8 repos solved it 8 ways
Every repo eventually built this: bajrangbali (`lib/permissions.ts` named
policies + `requireRole`), mcs (`role-context.tsx` + Team page +
`api/team`), influencer (`lib/admin.ts` env allowlist), nlp_coach (the
richest: `lib/permissions.ts` PERMISSION catalog + `ROUTE_PERMISSION` map,
`hooks/usePermissions.ts`, `RouteGuard.tsx`, `lib/server/auth.ts`
`requirePermission()`, `pages/Team.tsx` role grid with last-admin lock,
migration `0018` roles/permissions tables + `has_permission()` RLS fn),
stone (`lib/permissions.ts` + `requirePerm`), fortexa (`lib/roles.ts`
static map + `useRole`), kayoice (`lib/auth.ts` tenant guards + role-aware
redirect middleware, loop-safe `?next=`), poss_new (`packages/core/src/rights.ts`
Right vs AppPage split + Settings.tsx checkbox `Grid` matrix + nav items
tagged with access page).

**Recommended design:** static role→permission map as the default (fortexa/
poss shape, zero DB), with the nlp DB-driven tables as the documented
upgrade path. Ship: `lib/permissions.ts`, `usePermissions()/can()`,
`RouteGuard`, server `requirePermission()`, nav gating via a `permission`
key on nav items, Team settings page with the poss-style matrix editor,
kayoice's invite-with-temp-credentials (`api/admin/clients/[id]/invite` —
readable generated password, idempotent re-invite; fix its unpaginated
`listUsers`). Owner always keeps everything; empty override falls back to
defaults (never lock out).

### 2. Spreadsheet / CSV import wizard  ⭐ 5 independent implementations
The mirror-image of ExportMenu and the #1 "new project" time sink.
- nlp_coach `src/lib/leadImport.ts` — **best core**: `parseFile` (one XLSX
  path for xlsx/xls/csv), `guessHeaderRow` (scores top 15 rows, skips
  banner rows), `guessMapping` (prioritized regex matchers), `fixMojibake`,
  `normalizePhone`, ambiguity-refusing `parseDate`, `buildRows` →
  `{ready, skipped, duplicateOfExisting, duplicateInFile}`; 4-step
  `ImportLeadsDialog.tsx` (source → sheet/header → column map → preview).
- bajrangbali `components/BulkContactImportDialog.tsx` — header-alias table
  (~80 spellings), optional AI column-mapping rescue, manual override
  picker, two-layer dedup, `.vcf` parsing.
- kayoice `lib/csv.ts` + contact-lists route — quote-aware parser, 500-row
  chunked inserts, delete-empty-parent on zero valid rows.
- SHEETSFLOW `src/store/appStore.ts` `inferType()` (type inference from 20
  samples) + confirm-step UI with editable per-column type dropdowns.
- khatriautomations finance import — alias `pick()`, ₹/comma-stripping
  `num()`, "Download template" starter CSV.

**Recommended design:** generic `<ImportWizard schema={fields}>` +
`useSpreadsheetImport` — steps: drop file → header-row detection → alias
auto-map with manual override → typed preview with per-row rejection
reasons → chunked commit returning `{added, skipped[]}`. Two-step
preview-then-commit API shape (`apply:false` → `apply:true`, from nlp's
AttendanceImportDialog) for server-side variants.

### 3. Status/tone registry + `<StatusBadge>`  (4+ repos hand-roll it)
bd_dashboard `lib/status.ts` is the model: `Tone` union + parallel
`TONE_BADGE/TONE_DOT/TONE_TEXT/TONE_HEX` maps (hex feeds recharts so chart
and badge colors can't drift) + per-entity status maps + `statusMeta()`
with humanizing fallback for unknown keys. Variants: bajrangbali
`badgeTones.ts` + `StatusBadge.tsx`, rrbds (three ad-hoc maps), kayoice
badge tones. Replaces the STATUS maps currently duplicated per page in the
boilerplate template. Effort S, port near-verbatim.

### 4. Activity / audit log  (5 repos)
Two complementary halves:
- **DB trigger** (free coverage of every table): spicebooks migration
  `20260428…` / nlp migration `0018` §9 — generic `log_change()` captures
  old/new jsonb, attached to a table array via `DO $$` loop; nlp `0019`
  refinement skips no-op updates + ignores `updated_at`-style columns
  (learned in production); kaykeep's append-only RLS (select+insert only,
  no update/delete grants) is the right hardening.
- **Client logger** for what the DB can't see (login, export, print, page
  view): spicebooks `useActivityLogger`, bajrangbali `activity.server.ts` —
  always fire-and-forget, never throws into the mutation.
- **Feed UI:** bajrangbali `ActivityFeed.tsx` (search + user/action/entity/
  date facets built from the data, Today/Yesterday sticky groups, deep-link
  rows, verb-toned fallback icons; works as widget `limit=8` or full page)
  or nlp `Activity.tsx` (expandable field-level old→new diff).

### 5. App settings + admin-editable option sets  (5 repos)
Two related features:
- **Settings registry:** bajrangbali `lib/settings.server.ts` — every knob
  declared `{key, section, label, help, type, def, min/max, env}`;
  resolution DB ← env override ← default; 60s cache; `SystemSettingsCard`
  UI shows per-value provenance (env/saved/default) + live search +
  Advanced tier. Lighter cousin: bd `lib/settings.ts` (JSON in a Storage
  bucket).
- **Option sets** (editable dropdown vocabularies): khatriautomations
  `src/lib/options/*` is the best version — registry with shipped
  defaults, per-tenant overrides, `extendable` vs `locked` (+lockedReason)
  vocabularies, `useSyncExternalStore` singleton cache, zero rows stored
  until customized; nlp `OptionSelect.tsx` adds the retired-value guard
  (old records keep rendering `"Walk in (retired)"` instead of silently
  rewriting).

### 6. Promise-based `useConfirm()`  (2 repos, pairs with bulk bar)
mcs `ui/confirm-dialog.tsx` (72 lines: `if (!(await confirm({title,
description, destructive}))) return;`) — khatriautomations
`ConfirmContext.tsx` adds the critical nested-modal fix (built on Radix
AlertDialog so it works when opened from inside another modal; a plain
fixed div inherits the parent portal's pointer-events:none). Port the
khatriautomations version. Effort S.

### 7. Realtime sync  (spicebooks, 40 lines, port verbatim)
`useRealtimeSync.ts`: one Realtime subscription on all `postgres_changes`
→ 300ms debounce → blanket `queryClient.invalidateQueries()`. Every open
screen stays live across tabs/users. Plus one-line publication migration.
Highest value-per-line in the sweep. khatriautomations `useRealtime.ts` is
the per-table variant for hot tables.

### 8. Global period / date-range filtering  (3 repos)
stone `PeriodContext.tsx` (presets incl. Indian FY `fyStart()`,
localStorage-persisted, `inPeriod()` helper) + `PeriodPicker` in the dark
top bar; bajrangbali `lib/dateRange.ts` (lexicographic YYYY-MM-DD compare —
no per-row Date parsing) + `DateRangeFilter.tsx` (presets + custom from/to
that survive preset flips). Ship both: app-global PeriodContext + per-table
DateRangeFilter.

### 9. File / image upload  (3 repos)
kaykeep `features/photos/*` is the security model to copy: server mints
signed upload URL with path derived from session (client can never choose
the owner folder), extension allowlist, browser PUTs directly to storage,
**orphaned object deleted if the row insert fails**, batch signed-URL reads
(1h TTL), polymorphic FK map so one attachments table serves every entity.
UI: stone `ImagePicker.tsx` (thumb strip, "main" badge) + its
`api/media/thumb` proxy (avoids tainted-canvas when embedding in browser
PDFs). Grab mcs `resizeToDataUrl()` (9-line client-side downscale ≤1600px
JPEG 0.82 before upload).

### 10. Dashboard chart/widget kit  (4 repos)
bd `DashboardCharts.tsx`: shared `TOOLTIP_STYLE/TICK/CURSOR` constants
built from CSS vars (charts flip with dark mode, no JS), the
`isLoading → Skeleton : empty → EmptyState : chart` triad per card, date
series pre-seeded with zeros so gaps don't collapse the axis, pie fills
from TONE_HEX. stone `ui.tsx` KpiCard (accent bar + href drill-down) /
KpiRow / SectionCard. SHEETSFLOW's config-driven aggregation engine
(`{label, column, aggregation, format}` KPI + `{type, categoryColumn,
valueColumn}` charts through `buildAggregatedData`/`buildTrendData` with
>60-point downsampling) — port logic, rewrite presentation onto tokens +
format.ts. Extract `<ChartCard>` + token constants + zero-fill helper.

### 11. Table & utility quick wins (all S/XS, port as-is)
- `useRowWindow` infinite scroll (bajrangbali, 70 lines) — 100-row batches
  via IntersectionObserver; the `filterSig` param stops inline edits from
  resetting scroll. Supports dual sentinels (desktop table + mobile cards).
- `InlineEditCell` (bajrangbali, 81 lines) / stone `InlineCell` — dblclick→
  input, Enter saves, Esc cancels, stopPropagation preserves row-click.
  stone `stock-expression.ts` adds safe `=45-3`/`+5` arithmetic entry.
- Natural sort (stone `natural-sort.ts`, 29 lines) — L2 before L10.
- `fetchAllRows` (khatriautomations) — chunked reads past PostgREST's
  1000-row cap; prevents silently truncated lists.
- `TagInput` (nlp, 113 lines) — dedupe, Backspace-removes-last,
  onMouseDown-beats-blur suggestions.
- format.ts should absorb `timeAgo`/`relativeDate` (reinvented locally in
  4+ pages across repos).
- `waLink`/`normalizePhone` (spicebooks `lib/whatsapp.ts` lines 1–31) —
  wa.me deep links for any contact list (NOT the send/gateway half).
- Copy-to-clipboard + `<RevealOnceSecret>` (kayoice writes the identical
  amber show-once panel 4×).

---

## TIER 2 — optional modules (high value, add when a project needs it)

- **AI assistant kit** (on-brand for the "boilerplate for AI" positioning):
  bajrangbali `lib/assistant/toolPolicy.ts` — every tool classified by risk
  (read/write/send/destructive) × magnitude(args); `decide()` → auto/
  confirm/deny with human preview sentence; fails closed; role-scoped
  write ceilings; CI check that every tool is classified. Plus
  `AssistantPanel.tsx` ("LLM stages, button executes") and meta_analytics
  `packages/ai/structured.ts` (zod→tool-schema forced tool call, works on
  both Anthropic API and OpenRouter, returns usage + est. cost).
- **Developer/SaaS module** (kayoice): API keys (HMAC-hashed, show-once,
  scopes, per-key RPM), outbound webhooks (HMAC signature, delivery log,
  auto-disable after 10 failures, test-event endpoint), usage metering +
  plan caps (append-only usage_events → SQL view → fail-open cap check →
  progress UI; SHEETSFLOW `PLAN_LIMITS` client half).
- **Print/document toolkit:** bajrangbali `printWindow.ts`
  (`printBrandedTable`) + generic `<DocumentTemplate>` from voucherPrint's
  `{meta, money, narration}` contract; mcs `bill-render.ts` SVG→PNG+PDF
  (one artifact for print/email/WhatsApp); spicebooks `printHtml`/
  `captureHtmlToPng` extraction; nlp certificate designer
  (`design.ts`/`renderPdf.ts` — mm-on-A4 element model, same renderer for
  preview and issuance; the 620-line drag editor is the L part); stone
  `qrPdf.ts` N-up label grids + `openPdfForPrint`.
- **Background jobs:** meta_analytics `0002_job_queue.sql` + `queue.ts` —
  Supabase-only queue (SECURITY DEFINER RPCs, `FOR UPDATE SKIP LOCKED`,
  exponential backoff, singleton dedupe, EXECUTE revoked from anon —
  copy that verbatim). Cron kit: `requireCronSecret` (identical guard in
  4 repos), bd pause-switch + `SystemControls` kill-switch card,
  bajrangbali `recordCronRun` telemetry, bd `error-logger.ts`; rrbds
  `PipelineQueue.tsx` ops view + 13-preset cron schedule editor.
  khatriautomations `heartbeat/interval.ts` staleness detection (derives
  expected interval from schedule, not state — documented 17-day-outage
  lesson).
- **Bulk-edit undo** (nlp `0016_bulk_edits.sql` + `UndoLastBulkEdit.tsx`) —
  jsonb snapshot per bulk edit, 24h one-click restore, no DELETE grant.
  Pairs directly with the bulk bar.
- **Report builder:** khatriautomations `lib/reports/sources.ts` +
  `engine.ts` (declarative source registry → org-scoped query → shared
  formatValue → CSV/branded PDF; adding a report = one registry entry) +
  spicebooks Reports hub shell (`?view=` deep links, `DrillCtx` drill-down,
  `#report-printable`). The hub is the shell; the engine is the engine.
- **Custom fields** (nlp `customFieldsApi.ts` + khatriautomations
  `custom-fields/*`): defs table + jsonb values, archived-never-deleted,
  save-after-parent-insert ordering, failures returned not thrown.
- **Stars/bookmarks** (spicebooks): snapshot-at-star-time rows + type
  registry; complements recents.
- **Web push** (bajrangbali `pushNotifications.server.ts` + kaykeep
  reminders loop): VAPID keys persisted in DB, dead-subscription pruning
  on 404/410, PWA `pwa-register.tsx` (22 lines). Heavy (service worker +
  schema + dep) — shelf until needed.
- **Customer portal + OTP login** (nlp `portalCodes.ts` + `PortalLayout`):
  the `?as=<id>` read-only admin impersonation preview (amber banner,
  query-key isolation) is the reusable idea.
- **Resumable large-file uploads** (nlp `uploads/manager.ts`, 778 lines):
  superb (singleton outside React, cross-tab heartbeat, wake lock) but
  only for GB-scale media projects.

## Infra/convention upgrades (fold into CLAUDE.md + lib)

- **Supabase client trio** — browser / server-session / service-role split
  + lazy throwing `env.ts` (kaykeep + kayoice converged independently).
  Boilerplate currently has a single client.
- **Result envelope** — `{ok:true,data}|{ok:false,error}` (kaykeep
  `ActionResult`, kayoice `apiOk/apiError`, bajrangbali `requireRole`).
  Pick one spelling, document beside friendlyDbError.
- **Best-effort side-effect writes** — activity/notification/telemetry
  writes are try/catch + console, never throw into the mutation (5 repos).
- **API fetch helpers** — nlp `apiFetch/apiJson` (attaches bearer, throws
  the API's own message), stone `api-helpers.ts` ok/err/handleError.
- **Per-tenant brand color** — one `--color-brand` CSS var from a tenant
  record (kayoice) = white-label switch on the existing token system.
- **Notify helper** — stone `notify.ts` (in-app notification insert +
  pluggable channel fan-out, config cached, never throws) gives the demo
  NotificationsBell a real backend.
- **Zod-at-the-boundary** as the documented upgrade path from manual
  validation (kaykeep schemas-per-slice + `issues[0].message` extraction).

---

## DO NOT generalize (verified, deliberately excluded)

Domain engines: freight/logistics (bajrangbali shipments/zones/tonnage),
double-entry accounting + FY (mcs allocate/books, spicebooks vouchers,
fy-switcher), GST/pricing (fortexa tax, stone pricing-rules), LMS
(nlp curriculum/video), 3D/spatial (stone viewer/floor map), e-commerce
(fortexa shop, all of vedapopfood/Shopify), POS offline/ESC-POS
(poss_new door/receipts), telecom compliance (kayoice TRAI), scrapers &
enrichment vendors (influencer/bd), WhatsApp gateway stacks
(KayChat/Interakt/WABA everywhere — design a `send(channel,to,payload)`
adapter interface instead of porting any of them), LemonSqueezy billing
as-a-whole, maker-checker pipeline boards (write a fresh generic kanban if
ever needed), spicebooks Sales.tsx Enter-to-advance **as implemented**
(worth having, but as a designed `useGridNav`/`<LineItemsTable>` rewrite —
the getElementById/setTimeout original doesn't port), spicebooks
CompanyContext (not real multi-tenancy — take only the persist-current-org
shape), physical_organize_things_app (nothing above boilerplate level).

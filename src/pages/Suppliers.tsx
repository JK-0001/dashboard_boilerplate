/**
 * Suppliers — CRUD page duplicated from the Products template (src/pages/
 * Products.tsx). Only the type, form fields, columns, search columns, export
 * columns, status map, and API calls differ — every structural pattern is
 * kept per CLAUDE.md.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Truck, ChevronDown, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SkeletonRows } from "@/components/ui/skeleton-table";

import { EntityCombobox } from "@/components/EntityCombobox";
import { ColumnFilter } from "@/components/ColumnFilter";
import { ExportMenu } from "@/components/ExportMenu";
import { StatusBadge } from "@/components/StatusBadge";
import { InlineEditCell } from "@/components/InlineEditCell";
import { DateRangeFilter, type DateRangeValue } from "@/components/DateRangeFilter";
import { ImportWizard } from "@/components/ImportWizard";

import { useListSearch, type SearchColumn } from "@/hooks/useListSearch";
import { useBatchSelection } from "@/hooks/useBatchSelection";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useF2Save } from "@/hooks/useFormShortcuts";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useRowWindow } from "@/hooks/useRowWindow";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePermissions } from "@/contexts/PermissionsContext";

import { supplierApi, type Supplier, type SupplierInput, type SupplierStatus } from "@/lib/demoStore";
import { logActivity } from "@/lib/activityLog";
import type { ImportField } from "@/lib/importSheet";
import { SUPPLIER_STATUS, statusMeta } from "@/lib/status";
import { dateInRange, localToday } from "@/lib/dateRange";
import { friendlyDbError } from "@/lib/dbErrors";
import { fmtDate } from "@/lib/format";

// ── form state ───────────────────────────────────────────────────────────────
interface FormState {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  city: string;
  gst_number: string;
  status: SupplierStatus;
  notes: string;
}
const emptyForm = (): FormState => ({
  name: "", contact_person: "", phone: "", email: "", city: "", gst_number: "", status: "active", notes: "",
});

// ── import schema (ImportWizard) ─────────────────────────────────────────────
const IMPORT_FIELDS: ImportField[] = [
  { key: "name",           label: "Supplier Name",  required: true, aliases: /^(name|supplier|vendor|party|firm|company)/i, hint: "Used to spot duplicates" },
  { key: "contact_person", label: "Contact Person", aliases: /(contact|person|owner|proprietor)/i },
  { key: "phone",          label: "Phone",          aliases: /(phone|mobile|cell|contact ?no)/i },
  { key: "email",          label: "Email",          aliases: /(email|e-?mail)/i },
  { key: "city",           label: "City",           aliases: /(city|town|place|location)/i },
  { key: "gst_number",     label: "GST Number",     aliases: /(gst|gstin|tax ?no)/i },
  { key: "notes",          label: "Notes",          aliases: /(note|remark|comment)/i },
];

export default function Suppliers() {
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = usePermissions();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [range, setRange] = useState<DateRangeValue>({ key: "all" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── data ──────────────────────────────────────────────────────────────────
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: supplierApi.list,
  });

  // ── search + column filters ───────────────────────────────────────────────
  const columns: SearchColumn<Supplier>[] = useMemo(
    () => [
      { key: "name",    get: (s) => s.name },
      { key: "contact", get: (s) => s.contact_person },
      { key: "phone",   get: (s) => s.phone },
      { key: "email",   get: (s) => s.email },
      { key: "city",    get: (s) => s.city },
      { key: "gst",     get: (s) => s.gst_number },
      { key: "status",  get: (s) => SUPPLIER_STATUS[s.status].label },
      { key: "created", get: (s) => fmtDate(s.created_at) },
      { key: "notes",   get: (s) => s.notes, hidden: true },
    ],
    [],
  );
  // Date-range filter runs before search/column filters.
  const dateFiltered = useMemo(
    () => suppliers.filter((s) => dateInRange(s.created_at, range.key, localToday(), range.from, range.to)),
    [suppliers, range],
  );
  const search = useListSearch(dateFiltered, columns);
  const { filtered } = search;
  // Bulk selection operates on the currently filtered rows.
  const sel = useBatchSelection(filtered);

  // Infinite-scroll windowing: render in 100-row batches. filterSig changes
  // only on real filter-criteria changes so inline edits don't reset scroll.
  const filterSig = `${range.key}|${range.from ?? ""}|${range.to ?? ""}|${search.global}|${JSON.stringify(search.colText)}|${JSON.stringify(search.colValues)}`;
  const win = useRowWindow(filtered, filterSig);

  useHotkeys({
    "/": (e) => {
      e.preventDefault();
      document.getElementById("suppliers-search")?.focus();
    },
  });

  // cities that already exist, for the create-on-the-fly combobox
  const cityOptions = useMemo(() => {
    const names = [...new Set(suppliers.map((s) => s.city).filter(Boolean))].sort();
    return names.map((n) => ({ id: n, name: n }));
  }, [suppliers]);

  // ── open/close ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSheetOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name, contact_person: s.contact_person, phone: s.phone,
      email: s.email, city: s.city, gst_number: s.gst_number,
      status: s.status, notes: s.notes,
    });
    setSheetOpen(true);
  };
  const closeSheet = () => {
    setSheetOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  // ?new=1 deep link (from the ⌘K palette / dashboard quick actions)
  useEffect(() => {
    if (router.isReady && router.query.new === "1") {
      openCreate();
      const { new: _n, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.new]);

  // draft persistence — new records only
  const draft = useFormDraft<FormState>({
    key: "supplier",
    value: form,
    enabled: sheetOpen && !editingId,
    onRestore: setForm,
    isEmpty: (f) =>
      !f.name && !f.contact_person && !f.phone && !f.email && !f.city && !f.gst_number && !f.notes,
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        contact_person: form.contact_person.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        city: form.city.trim(),
        gst_number: form.gst_number.trim().toUpperCase(),
        status: form.status,
        notes: form.notes.trim(),
      };
      return editingId ? supplierApi.update(editingId, payload) : supplierApi.create(payload);
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(editingId ? "Supplier updated" : "Supplier created");
      logActivity({
        action: editingId ? "update" : "create",
        entityType: "supplier",
        entityId: row.id,
        summary: `${editingId ? "Updated" : "Created"} supplier ${row.name}`,
      });
      draft.clear();
      closeSheet();
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (s: Supplier) => supplierApi.remove(s.id),
    onSuccess: (_d, s) => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.error("Supplier deleted"); // red toast = destructive action, by convention
      logActivity({ action: "delete", entityType: "supplier", entityId: s.id, summary: `Deleted supplier ${s.name}` });
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  // Bulk actions on the checkbox selection.
  const bulkStatusMutation = useMutation({
    mutationFn: (status: SupplierStatus) =>
      supplierApi.updateMany([...sel.selected], { status }),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`${sel.selected.size} suppliers set to ${SUPPLIER_STATUS[status].label}`);
      logActivity({
        action: "update",
        entityType: "supplier",
        summary: `Bulk set ${sel.selected.size} suppliers to ${SUPPLIER_STATUS[status].label}`,
      });
      sel.clear();
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: () => supplierApi.removeMany([...sel.selected]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.error(`${sel.selected.size} suppliers deleted`);
      logActivity({
        action: "delete",
        entityType: "supplier",
        summary: `Bulk deleted ${sel.selected.size} suppliers`,
      });
      sel.clear();
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  const handleBulkDelete = async () => {
    const n = sel.selected.size;
    const ok = await confirm({
      title: `Delete ${n} suppliers?`,
      message: "This will permanently remove the selected suppliers. This cannot be undone.",
      confirmLabel: `Delete ${n}`,
      danger: true,
    });
    if (ok) bulkDeleteMutation.mutate();
  };

  // Inline phone edit (double-click the phone cell).
  const inlinePhoneMutation = useMutation({
    mutationFn: ({ id, phone }: { id: string; phone: string }) =>
      supplierApi.update(id, { phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Phone updated");
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim()) { toast.error("Enter a supplier name"); return; }
    const email = form.email.trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) { toast.error("Enter a valid email address"); return; }
    const gst = form.gst_number.trim();
    if (gst && gst.length !== 15) toast.warning("GST numbers are usually 15 characters — double-check this one");
    saveMutation.mutate();
  };

  useF2Save(() => handleSubmit(), sheetOpen);

  const activeCount = filtered.filter((s) => s.status === "active").length;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} supplier{filtered.length === 1 ? "" : "s"} · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} />
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="suppliers-search"
              className="pl-8 w-52"
              placeholder="Search all fields… (press /)"
              value={search.global}
              onChange={(e) => search.setGlobal(e.target.value)}
            />
          </div>
          {can("data.import") && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
          )}
          <ExportMenu
            data={filtered}
            filename="suppliers"
            title="Suppliers"
            columns={[
              { key: "name", header: "Name" },
              { key: "contact_person", header: "Contact Person" },
              { key: "phone", header: "Phone" },
              { key: "email", header: "Email" },
              { key: "city", header: "City" },
              { key: "gst_number", header: "GST Number" },
              { key: "status", header: "Status", format: (s: Supplier) => SUPPLIER_STATUS[s.status].label },
              { key: "created_at", header: "Created", format: (s: Supplier) => fmtDate(s.created_at) },
            ]}
          />
          {can("suppliers.write") && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Selection bar — appears only while rows are checked */}
      {sel.selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium">{sel.selected.size} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Set status <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {(Object.keys(SUPPLIER_STATUS) as SupplierStatus[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => bulkStatusMutation.mutate(s)}>
                  {SUPPLIER_STATUS[s].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-destructive hover:text-destructive"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={sel.clear}>
            Clear
          </Button>
        </div>
      )}

      {/* Table card — bounded scroller so the sticky header pins */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div ref={win.scrollRef} className="overflow-y-auto h-[calc(100vh-200px)]">
            <Table striped>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={sel.allChecked ? true : sel.someChecked ? "indeterminate" : false}
                      onCheckedChange={() => sel.toggleAll()}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      City
                      <ColumnFilter colKey="city" search={search} />
                    </div>
                  </TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Status
                      <ColumnFilter colKey="status" search={search} />
                    </div>
                  </TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows rows={6} columns={10} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Truck className="h-8 w-8" />
                        <p className="text-sm">
                          {search.anyActive
                            ? "No suppliers match your filters."
                            : "No suppliers yet. Create your first supplier."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  win.visible.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => openEdit(s)}>
                      {/* Checkbox cell stops propagation so ticking never opens the modal */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={sel.selected.has(s.id)}
                          onCheckedChange={() => sel.toggle(s.id)}
                          aria-label={`Select ${s.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="truncate">{s.name}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.contact_person || "—"}
                      </TableCell>
                      {/* Inline edit: double-click the phone number. The cell
                          stops propagation so editing never opens the modal. */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <InlineEditCell
                          value={s.phone}
                          className="font-mono text-[13px]"
                          title="Double-click to edit phone"
                          onSave={(next) => inlinePhoneMutation.mutate({ id: s.id, phone: next.trim() })}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.email || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.city || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{s.gst_number || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge meta={statusMeta(SUPPLIER_STATUS, s.status)} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmtDate(s.created_at)}
                      </TableCell>
                      {/* Actions — stop propagation so buttons don't trigger the row click */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this supplier. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(s)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {/* Infinite-scroll sentinel — grows the window near the bottom */}
                {win.hasMore && (
                  <TableRow ref={win.sentinelRef}>
                    <TableCell colSpan={10} className="py-3 text-center text-xs text-muted-foreground">
                      Loading more… ({win.visibleCount} of {filtered.length})
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Spreadsheet import — generic wizard, schema declared above */}
      <ImportWizard<SupplierInput>
        open={importOpen}
        onOpenChange={setImportOpen}
        entityLabel="suppliers"
        fields={IMPORT_FIELDS}
        transform={(rec) => ({
          name: rec.name,
          contact_person: rec.contact_person,
          phone: rec.phone,
          email: rec.email,
          city: rec.city,
          gst_number: (rec.gst_number || "").toUpperCase(),
          status: "active" as SupplierStatus,
          notes: rec.notes,
        })}
        dedupeKey={(r) => r.name.trim().toLowerCase()}
        existingKeys={new Set(suppliers.map((s) => s.name.trim().toLowerCase()))}
        onCommit={async (rows) => {
          const n = await supplierApi.createMany(rows);
          qc.invalidateQueries({ queryKey: ["suppliers"] });
          logActivity({ action: "import", entityType: "supplier", summary: `Imported ${n} suppliers from spreadsheet` });
          return n;
        }}
      />

      {/* Create / edit modal — the customized Sheet (centered, transform-free) */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => { if (!o) closeSheet(); else setSheetOpen(true); }}
      >
        <SheetContent
          className="overflow-y-auto"
          onKeyDown={(e) => {
            if (e.key === "F2") { e.preventDefault(); handleSubmit(); }
          }}
        >
          <SheetHeader>
            <SheetTitle className="font-display">
              {editingId ? "Edit Supplier" : "New Supplier"}
            </SheetTitle>
          </SheetHeader>

          <p className="text-xs text-muted-foreground mt-1">
            <kbd className="rounded bg-muted px-1 font-mono text-[10px]">F2</kbd> save ·{" "}
            <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Esc</kbd> close
          </p>

          <form onSubmit={handleSubmit} className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Supplier Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Sharma Traders"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label>Contact Person</Label>
                <Input
                  value={form.contact_person}
                  onChange={(e) => set("contact_person", e.target.value)}
                  placeholder="e.g. Rakesh Sharma"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="e.g. 98290 11223"
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="e.g. rakesh@sharmatraders.in"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <EntityCombobox
                  value={form.city}
                  onChange={(id) => set("city", id)}
                  options={cityOptions}
                  placeholder="Type to search or create…"
                  freeText
                  noneLabel="— None —"
                />
              </div>
              <div className="grid gap-2">
                <Label>GST Number</Label>
                <Input
                  value={form.gst_number}
                  onChange={(e) => set("gst_number", e.target.value)}
                  placeholder="e.g. 08AABCS1234F1Z5"
                  className="font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as SupplierStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SUPPLIER_STATUS) as SupplierStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{SUPPLIER_STATUS[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Internal remarks…"
                rows={3}
              />
            </div>

            <Button type="submit" className="mt-1" disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? "Saving…"
                : editingId
                  ? "Update Supplier"
                  : "Create Supplier"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

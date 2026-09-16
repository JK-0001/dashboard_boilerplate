/**
 * Products — THE CRUD TEMPLATE PAGE. Duplicate this file for every entity in
 * a new project; only the columns, form fields, and API calls change.
 *
 * Conventions demonstrated (keep them all):
 *  - Page header: display-font title + count/summary subtitle, toolbar right
 *  - Search box with "/" hotkey, per-column funnel filters, Export menu
 *  - Striped table, sticky header, clickable rows → edit modal
 *  - Row actions (ghost icons) that stopPropagation; delete via AlertDialog
 *  - Create/edit form in the centered Sheet modal, grid gap-5 / grid-cols-2
 *  - Required = " *" in the label; manual validation → toast.error
 *  - F2 saves; drafts persist to localStorage for new records; ?new=1 opens
 *  - Toasts: green create/update, RED delete, orange warnings
 *  - SkeletonRows while loading; empty state distinguishes "no data" vs filters
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package, ChevronDown, Upload } from "lucide-react";

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
import { ImagePicker } from "@/components/ImagePicker";
import type { Attachment } from "@/lib/attachments";

import { useListSearch, type SearchColumn } from "@/hooks/useListSearch";
import { useBatchSelection } from "@/hooks/useBatchSelection";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useF2Save } from "@/hooks/useFormShortcuts";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useRowWindow } from "@/hooks/useRowWindow";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePermissions } from "@/contexts/PermissionsContext";

import { productApi, type Product, type ProductInput, type ProductStatus } from "@/lib/demoStore";
import { logActivity } from "@/lib/activityLog";
import type { ImportField } from "@/lib/importSheet";
import { PRODUCT_STATUS, statusMeta } from "@/lib/status";
import { dateInRange, localToday } from "@/lib/dateRange";
import { friendlyDbError } from "@/lib/dbErrors";
import { fmtAmt, fmtDate } from "@/lib/format";

// ── form state ───────────────────────────────────────────────────────────────
interface FormState {
  name: string;
  sku: string;
  category: string;
  price: string;   // inputs hold strings; parse at submit
  stock: string;
  status: ProductStatus;
  notes: string;
  images: Attachment[];
}
const emptyForm = (): FormState => ({
  name: "", sku: "", category: "", price: "", stock: "", status: "active", notes: "", images: [],
});

// ── import schema (ImportWizard) ─────────────────────────────────────────────
const IMPORT_FIELDS: ImportField[] = [
  { key: "name",     label: "Product Name", required: true, aliases: /^(name|product|item|title)/i },
  { key: "sku",      label: "SKU",          required: true, aliases: /(sku|code|item ?code|part ?no)/i, hint: "Used to spot duplicates" },
  { key: "category", label: "Category",     aliases: /(category|group|type)/i },
  { key: "price",    label: "Price",        type: "number", aliases: /(price|rate|mrp|amount)/i },
  { key: "stock",    label: "Stock",        type: "number", aliases: /(stock|qty|quantity|balance)/i },
  { key: "notes",    label: "Notes",        aliases: /(note|remark|comment)/i },
];

export default function Products() {
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
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: productApi.list,
  });

  // ── search + column filters ───────────────────────────────────────────────
  const columns: SearchColumn<Product>[] = useMemo(
    () => [
      { key: "name",     get: (p) => p.name },
      { key: "sku",      get: (p) => p.sku },
      { key: "category", get: (p) => p.category },
      { key: "price",    get: (p) => p.price },
      { key: "stock",    get: (p) => p.stock },
      { key: "status",   get: (p) => PRODUCT_STATUS[p.status].label },
      { key: "created",  get: (p) => fmtDate(p.created_at) },
      { key: "notes",    get: (p) => p.notes, hidden: true },
    ],
    [],
  );
  // Date-range filter runs before search/column filters.
  const dateFiltered = useMemo(
    () => products.filter((p) => dateInRange(p.created_at, range.key, localToday(), range.from, range.to)),
    [products, range],
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
      document.getElementById("products-search")?.focus();
    },
  });

  // categories that already exist, for the create-on-the-fly combobox
  const categoryOptions = useMemo(() => {
    const names = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
    return names.map((n) => ({ id: n, name: n }));
  }, [products]);

  // ── open/close ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSheetOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name, sku: p.sku, category: p.category,
      price: String(p.price), stock: String(p.stock),
      status: p.status, notes: p.notes, images: p.images ?? [],
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
    key: "product",
    value: form,
    enabled: sheetOpen && !editingId,
    onRestore: setForm,
    isEmpty: (f) => !f.name && !f.sku && !f.category && !f.price && !f.stock && !f.notes && f.images.length === 0,
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim(),
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        status: form.status,
        notes: form.notes.trim(),
        images: form.images,
      };
      return editingId ? productApi.update(editingId, payload) : productApi.create(payload);
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editingId ? "Product updated" : "Product created");
      logActivity({
        action: editingId ? "update" : "create",
        entityType: "product",
        entityId: row.id,
        summary: `${editingId ? "Updated" : "Created"} product ${row.name}`,
      });
      draft.clear();
      closeSheet();
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (p: Product) => productApi.remove(p.id),
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.error("Product deleted"); // red toast = destructive action, by convention
      logActivity({ action: "delete", entityType: "product", entityId: p.id, summary: `Deleted product ${p.name}` });
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  // Bulk actions on the checkbox selection.
  const bulkStatusMutation = useMutation({
    mutationFn: (status: ProductStatus) =>
      productApi.updateMany([...sel.selected], { status }),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${sel.selected.size} products set to ${PRODUCT_STATUS[status].label}`);
      logActivity({
        action: "update",
        entityType: "product",
        summary: `Bulk set ${sel.selected.size} products to ${PRODUCT_STATUS[status].label}`,
      });
      sel.clear();
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: () => productApi.removeMany([...sel.selected]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.error(`${sel.selected.size} products deleted`);
      logActivity({
        action: "delete",
        entityType: "product",
        summary: `Bulk deleted ${sel.selected.size} products`,
      });
      sel.clear();
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  // useConfirm demo: imperative confirm inside a handler (vs the declarative
  // <AlertDialog> used on standing row buttons).
  const handleBulkDelete = async () => {
    const n = sel.selected.size;
    const ok = await confirm({
      title: `Delete ${n} products?`,
      message: "This will permanently remove the selected products. This cannot be undone.",
      confirmLabel: `Delete ${n}`,
      danger: true,
    });
    if (ok) bulkDeleteMutation.mutate();
  };

  // Inline stock edit (double-click the stock cell).
  const inlineStockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      productApi.update(id, { stock }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock updated");
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim()) { toast.error("Enter a product name"); return; }
    if (!form.sku.trim())  { toast.error("Enter a SKU"); return; }
    if (form.price !== "" && Number(form.price) < 0) { toast.error("Price cannot be negative"); return; }
    saveMutation.mutate();
  };

  useF2Save(() => handleSubmit(), sheetOpen);

  const totalValue = filtered.reduce((s, p) => s + p.price * p.stock, 0);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} product{filtered.length === 1 ? "" : "s"} · {fmtAmt(totalValue)} stock value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} />
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="products-search"
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
            filename="products"
            title="Products"
            columns={[
              { key: "name", header: "Name" },
              { key: "sku", header: "SKU" },
              { key: "category", header: "Category" },
              { key: "price", header: "Price", numeric: true },
              { key: "stock", header: "Stock", numeric: true },
              { key: "status", header: "Status", format: (p: Product) => PRODUCT_STATUS[p.status].label },
              { key: "created_at", header: "Created", format: (p: Product) => fmtDate(p.created_at) },
            ]}
          />
          {can("products.write") && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Product
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
              {(Object.keys(PRODUCT_STATUS) as ProductStatus[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => bulkStatusMutation.mutate(s)}>
                  {PRODUCT_STATUS[s].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {can("products.delete") && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-destructive hover:text-destructive"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          )}
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
                  <TableHead>SKU</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Category
                      <ColumnFilter colKey="category" search={search} />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
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
                  <SkeletonRows rows={6} columns={9} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8" />
                        <p className="text-sm">
                          {search.anyActive
                            ? "No products match your filters."
                            : "No products yet. Create your first product."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  win.visible.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => openEdit(p)}>
                      {/* Checkbox cell stops propagation so ticking never opens the modal */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={sel.selected.has(p.id)}
                          onCheckedChange={() => sel.toggle(p.id)}
                          aria-label={`Select ${p.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {p.images?.[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.images[0].url}
                              alt=""
                              className="h-6 w-6 shrink-0 rounded object-cover border"
                            />
                          )}
                          <span className="truncate">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.category || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmtAmt(p.price)}</TableCell>
                      {/* Inline edit: double-click the stock number. The cell
                          stops propagation so editing never opens the modal. */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <InlineEditCell
                          value={String(p.stock)}
                          className="text-right font-mono text-[13px]"
                          title="Double-click to edit stock"
                          onSave={(next) => inlineStockMutation.mutate({ id: p.id, stock: Number(next) || 0 })}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge meta={statusMeta(PRODUCT_STATUS, p.status)} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmtDate(p.created_at)}
                      </TableCell>
                      {/* Actions — stop propagation so buttons don't trigger the row click */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {can("products.delete") && (
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
                                <AlertDialogTitle>Delete {p.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this product. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(p)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {/* Infinite-scroll sentinel — grows the window near the bottom */}
                {win.hasMore && (
                  <TableRow ref={win.sentinelRef}>
                    <TableCell colSpan={9} className="py-3 text-center text-xs text-muted-foreground">
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
      <ImportWizard<ProductInput>
        open={importOpen}
        onOpenChange={setImportOpen}
        entityLabel="products"
        fields={IMPORT_FIELDS}
        transform={(rec) => ({
          name: rec.name,
          sku: rec.sku,
          category: rec.category,
          price: Number(rec.price) || 0,
          stock: Number(rec.stock) || 0,
          status: "active" as ProductStatus,
          notes: rec.notes,
        })}
        dedupeKey={(r) => r.sku.toLowerCase()}
        existingKeys={new Set(products.map((p) => p.sku.toLowerCase()))}
        onCommit={async (rows) => {
          const n = await productApi.createMany(rows);
          qc.invalidateQueries({ queryKey: ["products"] });
          logActivity({ action: "import", entityType: "product", summary: `Imported ${n} products from spreadsheet` });
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
              {editingId ? "Edit Product" : "New Product"}
            </SheetTitle>
          </SheetHeader>

          <p className="text-xs text-muted-foreground mt-1">
            <kbd className="rounded bg-muted px-1 font-mono text-[10px]">F2</kbd> save ·{" "}
            <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Esc</kbd> close
          </p>

          <form onSubmit={handleSubmit} className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Product Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Steel Bolt M8"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label>SKU *</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => set("sku", e.target.value)}
                  placeholder="e.g. SB-M8-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <EntityCombobox
                  value={form.category}
                  onChange={(id) => set("category", id)}
                  options={categoryOptions}
                  placeholder="Type to search or create…"
                  freeText
                  noneLabel="— None —"
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as ProductStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRODUCT_STATUS) as ProductStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{PRODUCT_STATUS[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>Opening Stock</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Images</Label>
              <ImagePicker
                value={form.images}
                onChange={(v) => set("images", v)}
                folder="products"
              />
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
                  ? "Update Product"
                  : "Create Product"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

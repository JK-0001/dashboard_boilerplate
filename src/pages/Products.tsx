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
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

import { useListSearch, type SearchColumn } from "@/hooks/useListSearch";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useF2Save } from "@/hooks/useFormShortcuts";
import { useFormDraft } from "@/hooks/useFormDraft";

import { productApi, type Product, type ProductStatus } from "@/lib/demoStore";
import { friendlyDbError } from "@/lib/dbErrors";
import { fmtAmt, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// ── status badge convention: emerald=good, amber=warning, slate=neutral ─────
const STATUS: Record<ProductStatus, { label: string; badge: string }> = {
  active: {
    label: "Active",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800",
  },
  low_stock: {
    label: "Low stock",
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800",
  },
  discontinued: {
    label: "Discontinued",
    badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  },
};

// ── form state ───────────────────────────────────────────────────────────────
interface FormState {
  name: string;
  sku: string;
  category: string;
  price: string;   // inputs hold strings; parse at submit
  stock: string;
  status: ProductStatus;
  notes: string;
}
const emptyForm = (): FormState => ({
  name: "", sku: "", category: "", price: "", stock: "", status: "active", notes: "",
});

export default function Products() {
  const router = useRouter();
  const qc = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
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
      { key: "status",   get: (p) => STATUS[p.status].label },
      { key: "created",  get: (p) => fmtDate(p.created_at) },
      { key: "notes",    get: (p) => p.notes, hidden: true },
    ],
    [],
  );
  const search = useListSearch(products, columns);
  const { filtered } = search;

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
      status: p.status, notes: p.notes,
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
    isEmpty: (f) => !f.name && !f.sku && !f.category && !f.price && !f.stock && !f.notes,
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
      };
      return editingId ? productApi.update(editingId, payload) : productApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editingId ? "Product updated" : "Product created");
      draft.clear();
      closeSheet();
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: productApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.error("Product deleted"); // red toast = destructive action, by convention
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
              { key: "status", header: "Status", format: (p: Product) => STATUS[p.status].label },
              { key: "created_at", header: "Created", format: (p: Product) => fmtDate(p.created_at) },
            ]}
          />
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Product
          </Button>
        </div>
      </div>

      {/* Table card — bounded scroller so the sticky header pins */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-y-auto h-[calc(100vh-200px)]">
            <Table striped>
              <TableHeader>
                <TableRow>
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
                  <SkeletonRows rows={6} columns={8} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
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
                  filtered.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => openEdit(p)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.category || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmtAmt(p.price)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {p.stock.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", STATUS[p.status].badge)}>
                          {STATUS[p.status].label}
                        </Badge>
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
                                <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)}>
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
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
                    {(Object.keys(STATUS) as ProductStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS[s].label}</SelectItem>
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

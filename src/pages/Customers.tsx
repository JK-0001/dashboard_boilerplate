/**
 * Customers — CRUD page duplicated from the Products template (src/pages/Products.tsx).
 * Only the type, form fields, table columns, search columns, export columns,
 * STATUS map, and API calls differ — every structural pattern is preserved.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Users } from "lucide-react";

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

import { customerApi, type Customer, type CustomerStatus } from "@/lib/demoStore";
import { friendlyDbError } from "@/lib/dbErrors";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// ── status badge convention: blue=info/lead, emerald=good, slate=neutral ────
const STATUS: Record<CustomerStatus, { label: string; badge: string }> = {
  lead: {
    label: "Lead",
    badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800",
  },
  active: {
    label: "Active",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800",
  },
  inactive: {
    label: "Inactive",
    badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  },
};

// ── form state ───────────────────────────────────────────────────────────────
interface FormState {
  name: string;
  email: string;
  phone: string;
  city: string;
  status: CustomerStatus;
  notes: string;
}
const emptyForm = (): FormState => ({
  name: "", email: "", phone: "", city: "", status: "lead", notes: "",
});

export default function Customers() {
  const router = useRouter();
  const qc = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── data ──────────────────────────────────────────────────────────────────
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: customerApi.list,
  });

  // ── search + column filters ───────────────────────────────────────────────
  const columns: SearchColumn<Customer>[] = useMemo(
    () => [
      { key: "name",    get: (c) => c.name },
      { key: "email",   get: (c) => c.email },
      { key: "phone",   get: (c) => c.phone },
      { key: "city",    get: (c) => c.city },
      { key: "status",  get: (c) => STATUS[c.status].label },
      { key: "created", get: (c) => fmtDate(c.created_at) },
      { key: "notes",   get: (c) => c.notes, hidden: true },
    ],
    [],
  );
  const search = useListSearch(customers, columns);
  const { filtered } = search;

  useHotkeys({
    "/": (e) => {
      e.preventDefault();
      document.getElementById("customers-search")?.focus();
    },
  });

  // cities that already exist, for the create-on-the-fly combobox
  const cityOptions = useMemo(() => {
    const names = [...new Set(customers.map((c) => c.city).filter(Boolean))].sort();
    return names.map((n) => ({ id: n, name: n }));
  }, [customers]);

  // ── open/close ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSheetOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      name: c.name, email: c.email, phone: c.phone,
      city: c.city, status: c.status, notes: c.notes,
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
    key: "customer",
    value: form,
    enabled: sheetOpen && !editingId,
    onRestore: setForm,
    isEmpty: (f) => !f.name && !f.email && !f.phone && !f.city && !f.notes,
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        status: form.status,
        notes: form.notes.trim(),
      };
      return editingId ? customerApi.update(editingId, payload) : customerApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(editingId ? "Customer updated" : "Customer created");
      draft.clear();
      closeSheet();
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: customerApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.error("Customer deleted"); // red toast = destructive action, by convention
    },
    onError: (e) => toast.error(friendlyDbError(e)),
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim()) { toast.error("Enter a customer name"); return; }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      toast.error("Enter a valid email address"); return;
    }
    saveMutation.mutate();
  };

  useF2Save(() => handleSubmit(), sheetOpen);

  const activeCount = filtered.filter((c) => c.status === "active").length;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} customer{filtered.length === 1 ? "" : "s"} · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="customers-search"
              className="pl-8 w-52"
              placeholder="Search all fields… (press /)"
              value={search.global}
              onChange={(e) => search.setGlobal(e.target.value)}
            />
          </div>
          <ExportMenu
            data={filtered}
            filename="customers"
            title="Customers"
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "phone", header: "Phone" },
              { key: "city", header: "City" },
              { key: "status", header: "Status", format: (c: Customer) => STATUS[c.status].label },
              { key: "created_at", header: "Created", format: (c: Customer) => fmtDate(c.created_at) },
            ]}
          />
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Customer
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
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      City
                      <ColumnFilter colKey="city" search={search} />
                    </div>
                  </TableHead>
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
                  <SkeletonRows rows={6} columns={7} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-8 w-8" />
                        <p className="text-sm">
                          {search.anyActive
                            ? "No customers match your filters."
                            : "No customers yet. Create your first customer."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.email || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {c.phone || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.city || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", STATUS[c.status].badge)}>
                          {STATUS[c.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmtDate(c.created_at)}
                      </TableCell>
                      {/* Actions — stop propagation so buttons don't trigger the row click */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit"
                            onClick={() => openEdit(c)}
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
                                <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this customer. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(c.id)}>
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
              {editingId ? "Edit Customer" : "New Customer"}
            </SheetTitle>
          </SheetHeader>

          <p className="text-xs text-muted-foreground mt-1">
            <kbd className="rounded bg-muted px-1 font-mono text-[10px]">F2</kbd> save ·{" "}
            <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Esc</kbd> close
          </p>

          <form onSubmit={handleSubmit} className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Customer Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="name@company.com"
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
                  placeholder="98200 12345"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as CustomerStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS) as CustomerStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS[s].label}</SelectItem>
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
                  ? "Update Customer"
                  : "Create Customer"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

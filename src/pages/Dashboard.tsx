/**
 * Dashboard — KPI stat cards → quick actions → list widgets.
 * KPI cards are nav shortcuts (append ?ref=dash so Backspace returns here).
 */
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import {
  Package, IndianRupee, AlertTriangle, Boxes, Plus, ChevronRight, Settings,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { productApi, type Product } from "@/lib/demoStore";
import { fmtMoney, fmtDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatCard({
  title, value, sub, icon: Icon, tone, to, loading,
}: {
  title: string; value: string; sub: string; icon: LucideIcon;
  tone: string; to: string; loading: boolean;
}) {
  const router = useRouter();
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push(to + (to.includes("?") ? "&" : "?") + "ref=dash")}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", tone)} />
      </CardHeader>
      <CardContent className="pb-3">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className={cn("text-xl font-bold font-display", tone)}>{value}</div>
        )}
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function ListWidget({
  title, viewAllTo, loading, rows, empty, renderRow,
}: {
  title: string; viewAllTo: string; loading: boolean; rows: Product[];
  empty: string; renderRow: (p: Product) => React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => router.push(viewAllTo)}>
          View all <ChevronRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-3/4" />
              </li>
            ))
          ) : rows.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">{empty}</li>
          ) : (
            rows.map(renderRow)
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: productApi.list,
  });

  const stockValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const lowStock = products.filter((p) => p.status === "low_stock");
  const active = products.filter((p) => p.status === "active");
  const categories = new Set(products.map((p) => p.category).filter(Boolean));

  const quickActions = [
    { label: "New Product", icon: Plus, to: "/products?new=1" },
    { label: "Products", icon: Package, to: "/products" },
    { label: "Settings", icon: Settings, to: "/settings" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your workspace — cards drill into their pages (Backspace comes back).
        </p>
      </div>

      {/* KPI stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products" loading={isLoading} to="/products"
          value={String(products.length)} sub="in catalogue"
          icon={Package} tone="text-primary"
        />
        <StatCard
          title="Stock Value" loading={isLoading} to="/products"
          value={fmtMoney(stockValue)} sub="at current prices"
          icon={IndianRupee} tone="text-emerald-600"
        />
        <StatCard
          title="Low Stock" loading={isLoading} to="/products"
          value={String(lowStock.length)} sub="need reorder"
          icon={AlertTriangle} tone={lowStock.length ? "text-amber-600" : "text-foreground"}
        />
        <StatCard
          title="Categories" loading={isLoading} to="/products"
          value={String(categories.size)} sub={`${active.length} active products`}
          icon={Boxes} tone="text-foreground"
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {quickActions.map((a) => (
          <Button
            key={a.label}
            variant="outline"
            className="h-auto justify-start gap-2 py-2.5"
            onClick={() => router.push(a.to)}
          >
            <a.icon className="h-4 w-4 text-primary" />
            <span className="text-sm">{a.label}</span>
          </Button>
        ))}
      </div>

      {/* List widgets */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ListWidget
          title="Recent Products"
          viewAllTo="/products"
          loading={isLoading}
          rows={products.slice(0, 5)}
          empty="No products yet."
          renderRow={(p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50"
              onClick={() => router.push("/products")}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.category || "Uncategorised"} · {fmtDateShort(p.created_at)}
                </p>
              </div>
              <span className="font-mono text-sm w-24 text-right">{fmtMoney(p.price)}</span>
            </li>
          )}
        />
        <ListWidget
          title="Low Stock"
          viewAllTo="/products"
          loading={isLoading}
          rows={lowStock.slice(0, 5)}
          empty="All items are above threshold. 🎉"
          renderRow={(p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50"
              onClick={() => router.push("/products")}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800"
              >
                {p.stock} left
              </Badge>
            </li>
          )}
        />
      </div>
    </div>
  );
}

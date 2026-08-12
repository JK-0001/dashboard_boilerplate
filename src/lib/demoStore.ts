/**
 * demoStore — an in-memory fake API so the boilerplate runs with zero setup.
 *
 * ► REPLACE THIS FILE with your real data layer (Supabase / REST / tRPC).
 *   Keep the same function shapes (list/create/update/remove returning
 *   Promises) and every page keeps working unchanged — the pages only talk
 *   to this module through react-query.
 */
import { uid } from "@/lib/utils";

export type ProductStatus = "active" | "low_stock" | "discontinued";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
  notes: string;
  created_at: string;
}

export type ProductInput = Omit<Product, "id" | "created_at">;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

let products: Product[] = [
  { id: uid(), name: "Steel Bolt M8",        sku: "SB-M8-001",  category: "Fasteners",   price: 4.5,    stock: 12500, status: "active",       notes: "", created_at: daysAgo(2) },
  { id: uid(), name: "Steel Bolt M10",       sku: "SB-M10-002", category: "Fasteners",   price: 6.25,   stock: 8400,  status: "active",       notes: "", created_at: daysAgo(3) },
  { id: uid(), name: "Hex Nut M8",           sku: "HN-M8-003",  category: "Fasteners",   price: 2.1,    stock: 320,   status: "low_stock",    notes: "Reorder from Sharma Traders", created_at: daysAgo(5) },
  { id: uid(), name: "Bearing 6204",         sku: "BR-6204",    category: "Bearings",    price: 185,    stock: 940,   status: "active",       notes: "", created_at: daysAgo(7) },
  { id: uid(), name: "Bearing 6305",         sku: "BR-6305",    category: "Bearings",    price: 310,    stock: 65,    status: "low_stock",    notes: "", created_at: daysAgo(8) },
  { id: uid(), name: "V-Belt A42",           sku: "VB-A42",     category: "Belts",       price: 240,    stock: 410,   status: "active",       notes: "", created_at: daysAgo(10) },
  { id: uid(), name: "V-Belt B55",           sku: "VB-B55",     category: "Belts",       price: 385,    stock: 0,     status: "discontinued", notes: "Superseded by B56", created_at: daysAgo(40) },
  { id: uid(), name: "Gear Oil 90 (1L)",     sku: "GO-90-1L",   category: "Lubricants",  price: 520,    stock: 230,   status: "active",       notes: "", created_at: daysAgo(12) },
  { id: uid(), name: "Grease MP3 (500g)",    sku: "GR-MP3",     category: "Lubricants",  price: 310,    stock: 48,    status: "low_stock",    notes: "", created_at: daysAgo(15) },
  { id: uid(), name: "Coupling Rubber Star", sku: "CP-RS-95",   category: "Couplings",   price: 95,     stock: 1800,  status: "active",       notes: "", created_at: daysAgo(20) },
  { id: uid(), name: "Motor Pulley 4in",     sku: "MP-4",       category: "Pulleys",     price: 460,    stock: 240,   status: "active",       notes: "", created_at: daysAgo(25) },
  { id: uid(), name: "Motor Pulley 6in",     sku: "MP-6",       category: "Pulleys",     price: 720,    stock: 0,     status: "discontinued", notes: "", created_at: daysAgo(60) },
];

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export type CustomerStatus = "lead" | "active" | "inactive";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: CustomerStatus;
  notes: string;
  created_at: string;
}

export type CustomerInput = Omit<Customer, "id" | "created_at">;

let customers: Customer[] = [
  { id: uid(), name: "Rajesh Kumar",     email: "rajesh@kumarindustries.in",  phone: "98200 12345", city: "Mumbai",    status: "active",   notes: "", created_at: daysAgo(1) },
  { id: uid(), name: "Priya Sharma",     email: "priya.sharma@gmail.com",     phone: "98110 22334", city: "Delhi",     status: "lead",     notes: "Met at IMTEX expo, follow up next week", created_at: daysAgo(3) },
  { id: uid(), name: "Sharma Traders",   email: "sales@sharmatraders.co.in",  phone: "98300 44556", city: "Kolkata",   status: "active",   notes: "Bulk fastener buyer", created_at: daysAgo(6) },
  { id: uid(), name: "Anil Deshmukh",    email: "anil.d@rediffmail.com",      phone: "94220 55667", city: "Pune",      status: "active",   notes: "", created_at: daysAgo(9) },
  { id: uid(), name: "Meera Iyer",       email: "meera@iyerbearings.com",     phone: "98410 66778", city: "Chennai",   status: "lead",     notes: "Asked for bearing catalogue", created_at: daysAgo(12) },
  { id: uid(), name: "Gupta & Sons",     email: "",                           phone: "99870 77889", city: "Mumbai",    status: "inactive", notes: "No orders since last year", created_at: daysAgo(120) },
  { id: uid(), name: "Vikram Singh",     email: "vikram.singh@outlook.com",   phone: "98100 88990", city: "Jaipur",    status: "active",   notes: "", created_at: daysAgo(18) },
  { id: uid(), name: "Kavita Reddy",     email: "kavita@reddyengg.in",        phone: "99490 99001", city: "Hyderabad", status: "lead",     notes: "", created_at: daysAgo(21) },
  { id: uid(), name: "Patel Machinery",  email: "info@patelmachinery.com",    phone: "98250 10203", city: "Ahmedabad", status: "active",   notes: "Prefers WhatsApp for quotes", created_at: daysAgo(27) },
  { id: uid(), name: "Suresh Nair",      email: "suresh.nair@yahoo.com",      phone: "",            city: "Kochi",     status: "inactive", notes: "Business closed", created_at: daysAgo(200) },
];

export const productApi = {
  async list(): Promise<Product[]> {
    await delay();
    return [...products].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async create(input: ProductInput): Promise<Product> {
    await delay();
    // Demo of a "unique constraint": mirrors what friendlyDbError translates.
    if (products.some((p) => p.sku.toLowerCase() === input.sku.toLowerCase())) {
      throw Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" });
    }
    const row: Product = { ...input, id: uid(), created_at: new Date().toISOString() };
    products = [row, ...products];
    return row;
  },

  async update(id: string, patch: Partial<ProductInput>): Promise<Product> {
    await delay();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Product not found");
    products[idx] = { ...products[idx], ...patch };
    return products[idx];
  },

  async remove(id: string): Promise<void> {
    await delay();
    products = products.filter((p) => p.id !== id);
  },
};

export const customerApi = {
  async list(): Promise<Customer[]> {
    await delay();
    return [...customers].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async create(input: CustomerInput): Promise<Customer> {
    await delay();
    // Demo of a "unique constraint" on email: mirrors what friendlyDbError translates.
    if (
      input.email &&
      customers.some((c) => c.email.toLowerCase() === input.email.toLowerCase())
    ) {
      throw Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" });
    }
    const row: Customer = { ...input, id: uid(), created_at: new Date().toISOString() };
    customers = [row, ...customers];
    return row;
  },

  async update(id: string, patch: Partial<CustomerInput>): Promise<Customer> {
    await delay();
    const idx = customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Customer not found");
    customers[idx] = { ...customers[idx], ...patch };
    return customers[idx];
  },

  async remove(id: string): Promise<void> {
    await delay();
    customers = customers.filter((c) => c.id !== id);
  },
};

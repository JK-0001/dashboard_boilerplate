/**
 * Universal export utilities — CSV, Excel (xlsx), PDF (jsPDF + autoTable).
 * All exports respect a list of column definitions and the data already filtered by the page.
 */
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportColumn<T = any> = {
  key: string;
  header: string;
  /** Optional formatter; default: row[key] coerced to string */
  format?: (row: T) => string | number | null | undefined;
  /** Right-align in PDF/Excel for numbers */
  numeric?: boolean;
};

export interface ExportMeta {
  filename: string;
  title: string;
  companyName?: string;
  generatedBy?: string;
  filtersSummary?: string;
}

const cellValue = <T,>(row: T, col: ExportColumn<T>): string | number => {
  const raw = col.format ? col.format(row) : (row as any)[col.key];
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "number") return raw;
  return String(raw);
};

const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
};

const safeName = (name: string) =>
  `${name.replace(/[^a-z0-9-_]+/gi, "_")}_${stamp()}`;

/* ---------------- CSV ---------------- */
export function exportToCSV<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  meta: ExportMeta,
) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const headerLine = columns.map((c) => escape(c.header)).join(",");
  const lines = rows.map((r) => columns.map((c) => escape(cellValue(r, c))).join(","));
  const csv = [headerLine, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${safeName(meta.filename)}.csv`);
}

/* ---------------- Excel ---------------- */
export function exportToExcel<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  meta: ExportMeta,
) {
  const aoa: (string | number)[][] = [];
  if (meta.companyName) aoa.push([meta.companyName]);
  aoa.push([meta.title]);
  if (meta.filtersSummary) aoa.push([meta.filtersSummary]);
  aoa.push([`Generated: ${new Date().toLocaleString()}${meta.generatedBy ? ` by ${meta.generatedBy}` : ""}`]);
  aoa.push([]);
  aoa.push(columns.map((c) => c.header));
  rows.forEach((r) => aoa.push(columns.map((c) => cellValue(r, c))));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Auto-width: simple heuristic
  ws["!cols"] = columns.map((c) => ({
    wch: Math.min(
      40,
      Math.max(c.header.length + 2, ...rows.map((r) => String(cellValue(r, c) ?? "").length + 2)),
    ),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, meta.title.slice(0, 31) || "Sheet1");
  XLSX.writeFile(wb, `${safeName(meta.filename)}.xlsx`);
}

/* ---------------- theme-derived export colors ---------------- */
/**
 * Read an HSL token ("25 65% 42%") from the live stylesheet and convert to RGB,
 * so PDF/print exports always match the current theme — re-branding via
 * theme.css re-brands the exports too. Falls back if called without a DOM.
 */
function themeTokenRgb(token: string, fallback: [number, number, number]): [number, number, number] {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    const m = raw.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
    if (!m) return fallback;
    const h = Number(m[1]) / 360, s = Number(m[2]) / 100, l = Number(m[3]) / 100;
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue = (t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [
      Math.round(hue(h + 1 / 3) * 255),
      Math.round(hue(h) * 255),
      Math.round(hue(h - 1 / 3) * 255),
    ];
  } catch {
    return fallback;
  }
}

const rgbToCss = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;

/** Table header fill = --primary; alternate row fill = --secondary. */
const exportHeaderRgb = () => themeTokenRgb("--primary", [180, 100, 50]);
const exportAltRowRgb = () => themeTokenRgb("--secondary", [250, 245, 235]);

/* ---------------- PDF ---------------- */
export function exportToPDF<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  meta: ExportMeta,
  opts?: { orientation?: "p" | "l" },
) {
  const doc = new jsPDF({ orientation: opts?.orientation ?? "l", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Branded header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  if (meta.companyName) doc.text(meta.companyName, 40, 36);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(meta.title, 40, 54);

  doc.setFontSize(8);
  doc.setTextColor(100);
  const sub: string[] = [];
  if (meta.filtersSummary) sub.push(meta.filtersSummary);
  sub.push(`Generated: ${new Date().toLocaleString()}${meta.generatedBy ? ` by ${meta.generatedBy}` : ""}`);
  doc.text(sub.join("    •    "), 40, 70);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 84,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => String(cellValue(r, c) ?? ""))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: exportHeaderRgb(), textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: exportAltRowRgb() },
    columnStyles: columns.reduce((acc, c, i) => {
      if (c.numeric) acc[i] = { halign: "right" };
      return acc;
    }, {} as Record<number, any>),
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: (data) => {
      const pageCount = (doc.internal as any).getNumberOfPages();
      const current = (doc.internal as any).getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Page ${current} of ${pageCount}`,
        pageWidth - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: "right" },
      );
    },
  });

  doc.save(`${safeName(meta.filename)}.pdf`);
}

/* ---------------- helpers ---------------- */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Combine multiple HTML strings (one per voucher) into a single PDF using the browser's
 * print engine. Opens a hidden iframe so users get a native Save-as-PDF dialog.
 */
export function batchPrintHTML(htmls: string[], title = "Batch Print") {
  const combined = `<!doctype html><html><head><title>${title}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; }
      .voucher { page-break-after: always; }
      .voucher:last-child { page-break-after: auto; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
      th { background: ${rgbToCss(exportAltRowRgb())}; text-align: left; }
      h1, h2, h3 { margin: 0 0 8px; }
    </style></head><body>
    ${htmls.map((h) => `<div class="voucher">${h}</div>`).join("")}
    </body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(combined);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export function batchPrintVouchersHTML(bodies: string[], title = "Batch Print") {
  const combined = `<!doctype html><html><head><title>${title}</title>
    <style>
      @page { size: A5; margin: 8mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .voucher { page-break-after: always; padding-bottom: 6px; }
      .voucher:last-child { page-break-after: auto; }
    </style></head><body>
    ${bodies.map((h) => `<div class="voucher">${h}</div>`).join("")}
    </body></html>`;
  const w = window.open("", "_blank", "width=760,height=600");
  if (!w) return;
  w.document.write(combined);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

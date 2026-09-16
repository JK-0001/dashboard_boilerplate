/**
 * ImportWizard — generic three-step spreadsheet import dialog:
 *   1) File  — drop/select .xlsx/.xls/.csv, pick sheet + header row
 *   2) Map   — auto-guessed column mapping, every field user-overridable
 *   3) Preview — ready/skipped/duplicate counts + per-row reasons, commit
 *
 * Pages supply the schema (ImportField[]) and a transform; the wizard owns
 * the UX. See src/pages/Products.tsx for the reference wiring.
 */
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  buildRows, downloadTemplateCsv, emptyMapping, guessHeaderRow, guessMapping,
  parseSpreadsheetFile,
  type BuildResult, type ImportField, type Mapping, type ParsedSheet,
} from "@/lib/importSheet";

interface ImportWizardProps<T> {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** e.g. "products" — used in copy and toasts. */
  entityLabel: string;
  fields: ImportField[];
  /** Turn a mapped record into a row, or reject it with { error }. */
  transform: (rec: Record<string, string>, rowIndex: number) => T | { error: string };
  dedupeKey?: (row: T) => string;
  existingKeys?: Set<string>;
  /** Persist the approved rows; return how many were inserted. */
  onCommit: (rows: T[]) => Promise<number>;
}

type Step = "file" | "map" | "preview";

export function ImportWizard<T>({
  open, onOpenChange, entityLabel, fields, transform, dedupeKey, existingKeys, onCommit,
}: ImportWizardProps<T>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("file");
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<Mapping>(() => emptyMapping(fields));
  const [committing, setCommitting] = useState(false);

  const reset = () => {
    setStep("file");
    setSheets([]);
    setSheetIdx(0);
    setHeaderRow(0);
    setMapping(emptyMapping(fields));
  };
  const close = () => { reset(); onOpenChange(false); };

  const sheet = sheets[sheetIdx];
  const headers = sheet?.rows[headerRow] ?? [];
  const sampleRow = sheet?.rows[headerRow + 1] ?? [];

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (!parsed.length || parsed.every((s) => s.rows.length === 0)) {
        toast.error("That file appears to be empty");
        return;
      }
      const idx = parsed.findIndex((s) => s.rows.length > 1);
      const use = Math.max(0, idx);
      const hr = guessHeaderRow(parsed[use].rows);
      setSheets(parsed);
      setSheetIdx(use);
      setHeaderRow(hr);
      setMapping(guessMapping(parsed[use].rows[hr] ?? [], fields));
      setStep("map");
    } catch (e: any) {
      toast.error(`Could not read file: ${e.message}`);
    }
  };

  const pickSheet = (idx: number) => {
    setSheetIdx(idx);
    const hr = guessHeaderRow(sheets[idx].rows);
    setHeaderRow(hr);
    setMapping(guessMapping(sheets[idx].rows[hr] ?? [], fields));
  };
  const pickHeaderRow = (row: number) => {
    setHeaderRow(row);
    setMapping(guessMapping(sheet?.rows[row] ?? [], fields));
  };

  const result: BuildResult<T> | null = useMemo(() => {
    if (!sheet || step !== "preview") return null;
    return buildRows({
      rows: sheet.rows, headerRow, mapping, fields, transform, dedupeKey, existingKeys,
    });
  }, [sheet, step, headerRow, mapping, fields, transform, dedupeKey, existingKeys]);

  const commit = async () => {
    if (!result || result.ready.length === 0) {
      toast.warning("Nothing to import");
      return;
    }
    setCommitting(true);
    try {
      const n = await onCommit(result.ready);
      toast.success(`Imported ${n} ${entityLabel}`);
      close();
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Import {entityLabel}</DialogTitle>
        </DialogHeader>

        {step === "file" && (
          <div className="grid gap-4 py-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); void handleFile(e.dataTransfer.files?.[0]); }}
              className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40"
            >
              <FileSpreadsheet className="h-8 w-8" />
              <p className="text-sm">Drop a .xlsx / .xls / .csv here, or click to choose</p>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start gap-2"
              onClick={() => downloadTemplateCsv(fields, entityLabel)}
            >
              <Download className="h-3.5 w-3.5" /> Download template
            </Button>
          </div>
        )}

        {step === "map" && sheet && (
          <div className="grid gap-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              {sheets.length > 1 && (
                <div className="grid gap-2">
                  <Label>Sheet</Label>
                  <Select value={String(sheetIdx)} onValueChange={(v) => pickSheet(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sheets.map((s, i) => (
                        <SelectItem key={s.name} value={String(i)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label>Header row</Label>
                <Select value={String(headerRow)} onValueChange={(v) => pickHeaderRow(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sheet.rows.slice(0, 15).map((r, i) => (
                      <SelectItem key={i} value={String(i)}>
                        Row {i + 1}: {r.filter(Boolean).slice(0, 4).join(" · ").slice(0, 48) || "(blank)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3">
              {fields.map((f) => (
                <div key={f.key} className="grid grid-cols-2 items-center gap-4">
                  <div>
                    <Label>{f.label}{f.required ? " *" : ""}</Label>
                    {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                  </div>
                  <Select
                    value={String(mapping[f.key])}
                    onValueChange={(v) => setMapping({ ...mapping, [f.key]: Number(v) })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">— Not mapped —</SelectItem>
                      {headers.map((h, i) =>
                        h ? (
                          <SelectItem key={i} value={String(i)}>
                            {h}{sampleRow[i] ? ` (e.g. ${String(sampleRow[i]).slice(0, 18)})` : ""}
                          </SelectItem>
                        ) : null,
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => setStep("file")}>Back</Button>
              <Button type="button" onClick={() => setStep("preview")}>Preview</Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && result && (
          <div className="grid gap-4 py-2">
            <p className="text-sm">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{result.ready.length} ready</span>
              {" · "}
              <span className="text-muted-foreground">{result.issues.length} skipped</span>
              {" · "}
              <span className="text-muted-foreground">
                {result.dupExisting} already exist · {result.dupInFile} duplicated in file
              </span>
            </p>

            {result.ready.length > 0 && (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.ready.slice(0, 8).map((row, i) => (
                      <TableRow key={i}>
                        {fields.map((f) => (
                          <TableCell key={f.key} className="text-xs">
                            {String((row as Record<string, unknown>)[f.key] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {result.ready.length > 8 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    …and {result.ready.length - 8} more
                  </p>
                )}
              </div>
            )}

            {result.issues.length > 0 && (
              <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                {result.issues.slice(0, 8).map((iss) => (
                  <p key={iss.row}>Row {iss.row}: {iss.reason}</p>
                ))}
                {result.issues.length > 8 && <p>…and {result.issues.length - 8} more</p>}
              </div>
            )}

            <DialogFooter className="mt-1">
              <Button type="button" variant="outline" onClick={() => setStep("map")}>Back</Button>
              <Button type="button" onClick={() => void commit()} disabled={committing || result.ready.length === 0}>
                <Upload className="mr-2 h-4 w-4" />
                {committing ? "Importing…" : `Import ${result.ready.length}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

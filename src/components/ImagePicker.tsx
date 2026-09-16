/**
 * ImagePicker — thumbnail strip + add tile for a record's images.
 * First image is "Main". Validates, downsizes, and uploads through
 * attachmentApi (demo data-URLs or Supabase storage — same component).
 *
 *   <ImagePicker value={form.images} onChange={(v) => set("images", v)} folder="products" />
 */
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { attachmentApi, type Attachment } from "@/lib/attachments";
import { cn } from "@/lib/utils";

interface ImagePickerProps {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  /** Storage folder, e.g. "products". */
  folder: string;
  max?: number;
  disabled?: boolean;
}

export function ImagePicker({ value, onChange, folder, max = 6, disabled }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);

  const addFiles = async (files: FileList | File[] | null | undefined) => {
    if (!files || disabled) return;
    const room = max - value.length - busy;
    const list = [...files].slice(0, Math.max(0, room));
    if ([...files].length > list.length) toast.warning(`Only ${max} images per record`);
    for (const file of list) {
      setBusy((b) => b + 1);
      try {
        const att = await attachmentApi.upload(file, folder);
        onChange([...value, att]);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setBusy((b) => b - 1);
      }
    }
  };

  const remove = (att: Attachment) => {
    onChange(value.filter((a) => a.id !== att.id));
    void attachmentApi.remove(att); // best-effort, never blocks the UI
  };

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((att, i) => (
        <div key={att.id} className="group relative h-16 w-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={att.url}
            alt={att.name}
            title={att.name}
            className="h-16 w-16 rounded-md border object-cover"
          />
          {i === 0 && (
            <span className="absolute bottom-0 left-0 rounded-tr-md rounded-bl-md bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
              Main
            </span>
          )}
          {!disabled && (
            <button
              type="button"
              aria-label={`Remove ${att.name}`}
              onClick={() => remove(att)}
              className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      {Array.from({ length: busy }).map((_, i) => (
        <div key={`busy-${i}`} className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted/40">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ))}

      {!disabled && value.length + busy < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}
          title="Add images (drag & drop works)"
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed",
            "text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40",
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}

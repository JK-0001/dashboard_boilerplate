/**
 * Attachments — image/file upload behind one adapter.
 *
 * DEMO MODE (no Supabase env): files become in-memory data URLs so the UI
 * works with zero setup (lost on reload — that's fine for a demo).
 * SUPABASE MODE: uploads go to the "attachments" storage bucket (create it
 * in your project). The demo bucket is public for simplicity; for private
 * data use the signed-URL pattern instead: the SERVER mints
 * `createSignedUploadUrl` with a path derived from the session (client
 * never chooses the owner folder), the browser PUTs bytes directly, and if
 * the DB row insert fails you delete the orphaned object. See
 * docs/GENERALIZATION_AUDIT.md (kaykeep photos) for the full model.
 *
 * Always resize images client-side before upload (resizeImageFile) — a
 * 12MP phone photo is ~5MB; at ≤1600px/0.82 JPEG it's ~200KB.
 */
import { supabase } from "@/lib/supabase";
import { uid } from "@/lib/utils";

export interface Attachment {
  id: string;
  url: string;
  name: string;
  /** Storage path (Supabase mode) — needed for deletion. */
  path?: string;
}

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
export const MAX_IMAGE_MB = 8;
const BUCKET = "attachments";

/** Human error message, or null when the file is acceptable. */
export function validateImageFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) {
    return `"${file.name}" isn't a supported image (use ${ALLOWED_EXT.join("/")})`;
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    return `"${file.name}" is larger than ${MAX_IMAGE_MB}MB`;
  }
  return null;
}

/** Downscale to ≤maxDim px and re-encode as JPEG before upload. */
export function resizeImageFile(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 512 * 1024) return resolve(file); // already small
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(blob);
  });

export const attachmentApi = {
  /** Validate + resize + store. Throws with a human message on failure. */
  async upload(file: File, folder: string): Promise<Attachment> {
    const invalid = validateImageFile(file);
    if (invalid) throw new Error(invalid);
    const blob = await resizeImageFile(file);
    const id = uid();

    if (supabase) {
      const path = `${folder}/${id}.jpg`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return { id, url: data.publicUrl, name: file.name, path };
    }

    // Demo mode: data URL, in-memory only.
    return { id, url: await blobToDataUrl(blob), name: file.name };
  },

  /** Best-effort removal — an orphaned object is logged, never surfaced. */
  async remove(att: Attachment): Promise<void> {
    try {
      if (supabase && att.path) {
        await supabase.storage.from(BUCKET).remove([att.path]);
      }
    } catch (err) {
      console.error("[attachments] remove failed", err);
    }
  },
};

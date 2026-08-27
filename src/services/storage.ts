import { supabase, STORAGE_BUCKET } from "./supabase";

export interface UploadResult {
  path: string;
  url: string;
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 MB
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];

export function validateMedia(file: File): { ok: boolean; error?: string; type?: "image" | "video" } {
  const isImage = ALLOWED_IMAGE.includes(file.type);
  const isVideo = ALLOWED_VIDEO.includes(file.type);
  if (!isImage && !isVideo) {
    return { ok: false, error: "Unsupported file type. Use JPG, PNG, WEBP, GIF, MP4, WEBM." };
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image exceeds 15MB." };
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: "Video exceeds 80MB." };
  }
  return { ok: true, type: isImage ? "image" : "video" };
}

export async function uploadMedia(file: File): Promise<UploadResult> {
  const { data: me } = await supabase.auth.getUser();
  const uid = me.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "bin";
  const path = `u/${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function removeMedia(path: string): Promise<void> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}

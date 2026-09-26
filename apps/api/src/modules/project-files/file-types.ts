import path from "node:path";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".yaml": "application/yaml",
  ".yml": "application/yaml",
  ".feature": "text/plain",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".zip": "application/zip",
};

export const ALLOWED_EXTENSIONS = Object.keys(MIME_BY_EXTENSION);

export function mimeFor(fileName: string) {
  return MIME_BY_EXTENSION[path.extname(fileName).toLowerCase()];
}

export function safeFileName(original: string) {
  const base = path.basename(original.replace(/\\/g, "/"));
  const cleaned = base.replace(/[^\w.\- ()]+/g, "_").replace(/^\.+/, "").trim();
  return (cleaned || "file").slice(0, 150);
}

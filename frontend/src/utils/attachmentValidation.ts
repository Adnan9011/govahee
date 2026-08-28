import type { AttachmentSettings } from "@/api/types";
import { fa } from "@/i18n/fa";
import { formatNumber } from "@/utils/format";

export type AttachmentCategory = "image" | "audio" | "document";

export function defaultAttachmentSettings(): AttachmentSettings {
  return {
    max_image_size_mb: 5,
    max_audio_size_mb: 25,
    max_document_size_mb: 10,
    max_attachments_per_record: 10,
    allowed_image_extensions: "jpg,jpeg,png,gif,webp",
    allowed_audio_extensions: "mp3,wav,m4a,webm",
    allowed_document_extensions: "pdf",
    image_upload_enabled: true,
    audio_upload_enabled: true,
    document_upload_enabled: true,
  };
}

export function isAttachmentUploadEnabled(settings: AttachmentSettings): boolean {
  return (
    settings.image_upload_enabled ||
    settings.audio_upload_enabled ||
    settings.document_upload_enabled
  );
}

function parseExtensions(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((part) => part.trim().toLowerCase().replace(/^\./, ""))
      .filter(Boolean)
  );
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  return filename.slice(dot + 1).toLowerCase();
}

export function detectAttachmentCategory(
  filename: string,
  mimeType: string,
  settings: AttachmentSettings
): AttachmentCategory | null {
  const ext = extensionOf(filename);
  const imageExts = parseExtensions(settings.allowed_image_extensions);
  const audioExts = parseExtensions(settings.allowed_audio_extensions);
  const documentExts = parseExtensions(settings.allowed_document_extensions);

  if (imageExts.has(ext)) return "image";
  if (audioExts.has(ext)) return "audio";
  if (documentExts.has(ext)) return "document";

  const mime = (mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "document";
  return null;
}

function categorySettings(settings: AttachmentSettings, category: AttachmentCategory) {
  if (category === "image") {
    return {
      enabled: settings.image_upload_enabled,
      allowed: parseExtensions(settings.allowed_image_extensions),
      maxMb: settings.max_image_size_mb,
      label: fa.imageUploadEnabled,
    };
  }
  if (category === "audio") {
    return {
      enabled: settings.audio_upload_enabled,
      allowed: parseExtensions(settings.allowed_audio_extensions),
      maxMb: settings.max_audio_size_mb,
      label: fa.audioUploadEnabled,
    };
  }
  return {
    enabled: settings.document_upload_enabled,
    allowed: parseExtensions(settings.allowed_document_extensions),
    maxMb: settings.max_document_size_mb,
    label: fa.documentUploadEnabled,
  };
}

export function validateAttachmentFile(
  file: File,
  settings: AttachmentSettings,
  existingCount: number,
  options?: { ignoreDisabledTypes?: boolean; skipCountLimit?: boolean }
): string | null {
  const category = detectAttachmentCategory(file.name, file.type, settings);
  if (!category) {
    return fa.attachmentInvalidType;
  }

  const cfg = categorySettings(settings, category);
  if (!options?.ignoreDisabledTypes && !cfg.enabled) {
    return `${cfg.label} غیرفعال است.`;
  }

  const ext = extensionOf(file.name);
  if (!cfg.allowed.has(ext)) {
    return `پسوند فایل مجاز نیست. پسوندهای مجاز: ${[...cfg.allowed].join(", ")}`;
  }

  if (file.size <= 0) {
    return "فایل خالی است.";
  }
  if (file.size > cfg.maxMb * 1024 * 1024) {
    return `حجم فایل بیش از حد مجاز (${formatNumber(cfg.maxMb)} مگابایت) است.`;
  }
  if (!options?.skipCountLimit && existingCount >= settings.max_attachments_per_record) {
    return "تعداد پیوست‌ها به حد مجاز رسیده است.";
  }
  return null;
}

export function buildAttachmentAccept(settings: AttachmentSettings): string {
  const parts: string[] = [];
  if (settings.image_upload_enabled) {
    parseExtensions(settings.allowed_image_extensions).forEach((ext) => {
      parts.push(`.${ext}`);
    });
  }
  if (settings.audio_upload_enabled) {
    parseExtensions(settings.allowed_audio_extensions).forEach((ext) => {
      parts.push(`.${ext}`);
    });
  }
  if (settings.document_upload_enabled) {
    parseExtensions(settings.allowed_document_extensions).forEach((ext) => {
      parts.push(`.${ext}`);
    });
  }
  return parts.join(",");
}

export function buildImageDocumentAccept(settings: AttachmentSettings): string {
  const parts: string[] = [];
  if (settings.image_upload_enabled) {
    parseExtensions(settings.allowed_image_extensions).forEach((ext) => {
      parts.push(`.${ext}`);
    });
    parts.push("image/*");
  }
  if (settings.document_upload_enabled) {
    parseExtensions(settings.allowed_document_extensions).forEach((ext) => {
      parts.push(`.${ext}`);
    });
  }
  return parts.join(",");
}

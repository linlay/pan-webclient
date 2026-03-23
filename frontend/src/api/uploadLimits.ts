import { apiUrl } from "./routing";
import { translate } from "@/i18n";

export const DEFAULT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export let MAX_UPLOAD_BYTES = DEFAULT_MAX_UPLOAD_BYTES;

export function setMaxUploadBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return;
  }
  MAX_UPLOAD_BYTES = Math.floor(bytes);
}

export async function loadUploadLimits() {
  try {
    const response = await fetch(apiUrl("/api/health"), {
      credentials: "omit",
    });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json().catch(() => null)) as
      | { maxUploadBytes?: number }
      | null;
    if (typeof payload?.maxUploadBytes === "number") {
      setMaxUploadBytes(payload.maxUploadBytes);
    }
  } catch {
    // Fall back to the default limit when runtime config cannot be loaded.
  }
}

export function formatUploadLimit(bytes: number) {
  const megabytes = bytes / 1024 / 1024;
  return Number.isInteger(megabytes)
    ? `${megabytes} MB`
    : `${megabytes.toFixed(1)} MB`;
}

export function uploadSizeErrorMessage(files: Iterable<{ size: number }>) {
  let totalBytes = 0;
  for (const file of files) {
    totalBytes += file.size;
    if (totalBytes > MAX_UPLOAD_BYTES) {
      return translate("uploadLimits.totalSizeExceeded", {
        size: formatUploadLimit(MAX_UPLOAD_BYTES),
      });
    }
  }
  return null;
}

export function uploadRequestErrorMessage(
  status: number,
  statusText: string,
  response: unknown,
  responseText: string,
) {
  if (response && typeof response === "object" && "message" in response) {
    const message = response.message;
    if (typeof message == "string" && message.trim() !== "") {
      return message;
    }
  }
  if (status === 413) {
    return translate("uploadLimits.totalSizeExceeded", {
      size: formatUploadLimit(MAX_UPLOAD_BYTES),
    });
  }
  try {
    const payload = JSON.parse(responseText) as { message?: string } | null;
    if (payload?.message) {
      return payload.message;
    }
  } catch { }
  return `${status} ${statusText}`.trim();
}

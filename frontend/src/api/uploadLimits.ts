export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

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
      return `单次上传总大小不能超过 ${formatUploadLimit(MAX_UPLOAD_BYTES)}。`;
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
    return `单次上传总大小不能超过 ${formatUploadLimit(MAX_UPLOAD_BYTES)}。`;
  }
  try {
    const payload = JSON.parse(responseText) as { message?: string } | null;
    if (payload?.message) {
      return payload.message;
    }
  } catch { }
  return `${status} ${statusText}`.trim();
}

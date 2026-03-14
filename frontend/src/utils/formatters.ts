export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024)
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function formatDateTime(value: number) {
  return new Date(value * 1000).toLocaleString();
}

export function formatCompactDate(value: number) {
  return new Date(value * 1000).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
  });
}

export function formatUploadProgress(progress: {
  loaded: number;
  total: number;
}) {
  if (progress.total > 0) {
    return `上传中 ${Math.min(
      100,
      Math.round((progress.loaded / progress.total) * 100),
    )}%`;
  }
  if (progress.loaded > 0) {
    return `已上传 ${formatBytes(progress.loaded)}`;
  }
  return "上传中...";
}

export function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

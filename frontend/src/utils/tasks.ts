import type { TransferTask } from "@/types/contracts";

export function isLocalTaskId(taskId: string) {
  return taskId.startsWith("local-");
}

export function buildLocalUploadTask(files: File[]): TransferTask {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `local-upload-${Date.now()}`,
    kind: "upload",
    status: "running",
    detail:
      files.length === 1
        ? `Uploading ${files[0]?.name ?? "file"}`
        : `Uploading ${files.length} files`,
    items: files.map((file) => ({
      name: file.name,
      path: file.name,
      size: file.size,
      isDir: false,
    })),
    totalBytes,
    completedBytes: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function taskPrimaryLabel(task: TransferTask) {
  const items = task.items ?? [];
  if (items.length === 0) {
    return task.kind === "upload" ? "Upload Task" : "Download Task";
  }
  if (items.length === 1) {
    return items[0].name;
  }
  return `${items[0].name} +${items.length - 1}`;
}

export function taskTotalBytes(task: TransferTask) {
  if (typeof task.totalBytes === "number" && task.totalBytes > 0) {
    return task.totalBytes;
  }
  return (task.items ?? []).reduce((sum, item) => sum + item.size, 0);
}

export function taskCompletedBytes(task: TransferTask) {
  const total = taskTotalBytes(task);
  if (typeof task.completedBytes === "number") {
    return Math.max(
      0,
      Math.min(task.completedBytes, total || task.completedBytes),
    );
  }
  return task.status === "success" ? total : 0;
}

export function taskProgressPercent(task: TransferTask) {
  const total = taskTotalBytes(task);
  const completed = taskCompletedBytes(task);
  if (total <= 0) {
    return task.status === "success" ? 100 : 0;
  }
  return Math.max(0, Math.min(100, (completed / total) * 100));
}

export function taskHasByteProgress(task: TransferTask) {
  return taskTotalBytes(task) > 0;
}

export function shouldShowTaskProgress(task: TransferTask) {
  return taskHasByteProgress(task) || task.status === "success";
}

export function taskSummary(task: TransferTask) {
  const count = task.items?.length ?? 0;
  const noun = count === 1 ? "item" : "items";
  const type = task.kind === "upload" ? "Upload" : "Download";
  if (!count) {
    return type;
  }
  return `${type} · ${count} ${noun}`;
}

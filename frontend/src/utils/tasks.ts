import type { TransferTask } from "@/types/contracts";
import { translate } from "@/i18n";
import { formatBytes } from "./formatters";

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
        ? translate("tasks.detail.uploadingOne", {
            name: files[0]?.name ?? translate("common.file"),
          })
        : translate("tasks.detail.uploadingMany", { count: files.length }),
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
    return task.kind === "upload"
      ? translate("common.upload")
      : translate("tasks.summary.zipArchive");
  }
  if (items.length === 1) {
    return items[0].name;
  }
  return `${items[0].name} +${items.length - 1}`;
}

export function isDownloadTaskReady(task: TransferTask) {
  return (
    task.kind === "download" &&
    task.status === "success" &&
    Boolean(task.downloadUrl)
  );
}

export function isUploadTaskComplete(task: TransferTask) {
  return task.kind === "upload" && task.status === "success";
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
  if (isDownloadTaskReady(task) || isUploadTaskComplete(task)) {
    return false;
  }
  return taskHasByteProgress(task) || task.status === "success";
}

export function taskSummary(task: TransferTask) {
  const count = task.items?.length ?? 0;
  const type =
    task.kind === "upload"
      ? translate("tasks.summary.upload")
      : isDownloadTaskReady(task)
        ? translate("tasks.summary.zipReady")
        : translate("tasks.summary.zipPacking");
  if (!count) {
    return type;
  }
  return `${type} · ${translate("tasks.summary.countSuffix", { count })}`;
}

export function taskDisplayDetail(task: TransferTask) {
  if (isUploadTaskComplete(task)) {
    return "";
  }
  if (task.kind !== "download") {
    return task.detail;
  }
  switch (task.detail) {
    case "Preparing archive":
      return translate("tasks.detail.preparingArchive");
    case "Building ZIP archive":
      return translate("tasks.detail.buildingArchive");
    case "Archive ready":
      return "";
    default:
      return task.detail;
  }
}

export function taskFooterLabel(task: TransferTask) {
  if (isUploadTaskComplete(task)) {
    return translate("tasks.footer.transferComplete");
  }
  if (isDownloadTaskReady(task)) {
    const total = taskTotalBytes(task);
    return total > 0
      ? translate("tasks.footer.sourceTotalSize", {
          size: formatBytes(total),
        })
      : translate("tasks.footer.zipReady");
  }
  if (taskHasByteProgress(task)) {
    return `${formatBytes(taskCompletedBytes(task))} / ${formatBytes(taskTotalBytes(task))}`;
  }
  return task.status === "success" ? "100%" : "";
}

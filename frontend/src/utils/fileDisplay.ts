import type { FileEntry, PreviewKind, PreviewMeta } from "@/types/contracts";
import { translate } from "@/i18n";

type KindLike = { kind: PreviewKind };

export function previewIconName(preview: KindLike) {
  switch (preview.kind) {
    case "image":
      return "image";
    case "video":
      return "movie";
    case "audio":
      return "music_note";
    case "pdf":
      return "picture_as_pdf";
    case "markdown":
      return "article";
    case "text":
      return "description";
    case "directory":
      return "folder";
    default:
      return "draft";
  }
}

export function previewBgColor(preview: KindLike) {
  switch (preview.kind) {
    case "image":
      return "bg-amber-500/10";
    case "video":
      return "bg-slate-500/10";
    case "audio":
      return "bg-zinc-500/10";
    case "pdf":
      return "bg-rose-500/10";
    case "markdown":
    case "text":
      return "bg-slate-400/10";
    case "directory":
      return "bg-primary/10";
    default:
      return "bg-slate-100 dark:bg-slate-800";
  }
}

export function previewTextColor(preview: KindLike) {
  switch (preview.kind) {
    case "image":
      return "text-amber-500";
    case "video":
      return "text-slate-500";
    case "audio":
      return "text-zinc-500";
    case "pdf":
      return "text-rose-500";
    case "markdown":
    case "text":
      return "text-slate-400";
    case "directory":
      return "text-primary";
    default:
      return "text-slate-500";
  }
}

export function describePreviewKind(kind: PreviewMeta["kind"], mime: string) {
  switch (kind) {
    case "markdown":
      return translate("fileTypes.markdown");
    case "text":
      return translate("fileTypes.text");
    case "download":
      return mime || translate("fileTypes.file");
    case "image":
      return translate("fileTypes.image");
    case "audio":
      return translate("fileTypes.audio");
    case "video":
      return translate("fileTypes.video");
    case "pdf":
      return translate("fileTypes.pdf");
    default:
      return kind;
  }
}

export function entryFromPreview(preview: PreviewMeta): FileEntry {
  return {
    mountId: preview.mountId,
    path: preview.path,
    name: preview.name,
    isDir: preview.kind === "directory",
    size: preview.size,
    modTime: preview.modTime,
    mime: preview.mime,
    extension: "",
  };
}

export function entryKey(entry: Pick<FileEntry, "mountId" | "path">) {
  return `${entry.mountId}:${entry.path}`;
}

export function isEntrySelected(
  entry: Pick<FileEntry, "mountId" | "path">,
  selectedEntries: Array<Pick<FileEntry, "mountId" | "path">>,
) {
  return selectedEntries.some(
    (item) => item.mountId === entry.mountId && item.path === entry.path,
  );
}

export function getFileVisual(entry: Pick<FileEntry, "isDir" | "mime">) {
  if (entry.isDir) {
    return {
      icon: "folder",
      color: "bg-primary/10 dark:bg-primary/20",
      textColor: "text-primary",
    };
  }
  if (entry.mime.startsWith("image/")) {
    return {
      icon: "image",
      color: "bg-amber-500/10 dark:bg-amber-500/20",
      textColor: "text-amber-500",
    };
  }
  if (entry.mime.startsWith("video/")) {
    return {
      icon: "movie",
      color: "bg-slate-500/10 dark:bg-slate-500/20",
      textColor: "text-slate-500",
    };
  }
  if (entry.mime.startsWith("audio/")) {
    return {
      icon: "music_note",
      color: "bg-zinc-500/10 dark:bg-zinc-500/20",
      textColor: "text-zinc-500",
    };
  }
  if (entry.mime === "application/pdf") {
    return {
      icon: "picture_as_pdf",
      color: "bg-rose-500/10 dark:bg-rose-500/20",
      textColor: "text-rose-500",
    };
  }
  if (entry.mime.startsWith("text/")) {
    return {
      icon: "description",
      color: "bg-slate-400/10 dark:bg-slate-400/20",
      textColor: "text-slate-400",
    };
  }
  return {
    icon: "draft",
    color: "bg-slate-100 dark:bg-slate-800",
    textColor: "text-slate-500",
  };
}

export function describeEntryType(
  entry: Pick<FileEntry, "isDir" | "mime" | "extension">,
) {
  if (entry.isDir) return translate("files.directory");
  if (entry.mime === "application/pdf") return translate("fileTypes.pdf");
  if (entry.mime.startsWith("image/")) return translate("fileTypes.image");
  if (entry.mime.startsWith("video/")) return translate("fileTypes.video");
  if (entry.mime.startsWith("audio/")) return translate("fileTypes.audio");
  if (entry.mime.startsWith("text/")) return translate("fileTypes.text");
  return entry.extension
    ? `${entry.extension.toUpperCase().replace(".", "")} ${translate("fileTypes.file")}`
    : translate("fileTypes.file");
}

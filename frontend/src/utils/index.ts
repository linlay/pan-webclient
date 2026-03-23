import { api } from "@/api";
import { getDateLocale, translate } from "@/i18n";
import { useEffect, useState } from "react";
import { OperationDialog, ThemeMode, ViewMode } from "@/types/home";
import {
  EditorDocument,
  FileEntry,
  FileTreeNode,
  MountRoot,
  TransferTask,
} from "@/types/contracts";
import {
  SHOW_HIDDEN_STORAGE_KEY,
  THEME_STORAGE_KEY,
  VIEW_MODE_STORAGE_KEY,
} from "@/static";
export * from "./editor";
export * from "./fileDisplay";
export * from "./formatters";
export * from "./share";
export * from "./tasks";

// ─── Dialog helpers ───
export function dialogEyebrow(kind: NonNullable<OperationDialog>["kind"]) {
  return kind === "delete"
    ? translate("dialog.dangerZone")
    : kind === "batch-download"
      ? translate("dialog.archive")
      : translate("dialog.operation");
}
export function dialogTitle(d: NonNullable<OperationDialog>) {
  switch (d.kind) {
    case "create-folder":
      return translate("dialog.createFolderTitle");
    case "rename":
      return translate("dialog.renameTitle", { name: d.entry.name });
    case "move":
      return translate("dialog.moveTitle", { count: d.entries.length });
    case "copy":
      return translate("dialog.copyTitle", { count: d.entries.length });
    case "delete":
      return translate("dialog.deleteTitle", { count: d.entries.length });
    case "batch-download":
      return translate("dialog.batchDownloadTitle", {
        count: d.entries.length,
      });
  }
}
export function dialogDescription(d: NonNullable<OperationDialog>) {
  switch (d.kind) {
    case "create-folder":
      return translate("dialog.createFolderDescription");
    case "rename":
      return translate("dialog.renameDescription");
    case "move":
      return translate("dialog.moveDescription");
    case "copy":
      return translate("dialog.copyDescription");
    case "delete":
      return translate("dialog.deleteDescription");
    case "batch-download":
      return translate("dialog.batchDownloadDescription");
  }
}
export function dialogFieldLabel(kind: NonNullable<OperationDialog>["kind"]) {
  switch (kind) {
    case "create-folder":
      return translate("dialog.folderName");
    case "rename":
      return translate("dialog.newName");
    case "move":
    case "copy":
      return translate("dialog.targetDirectory");
    case "batch-download":
      return translate("dialog.zipFileName");
    case "delete":
      return "";
  }
}
export function dialogConfirmLabel(kind: NonNullable<OperationDialog>["kind"]) {
  switch (kind) {
    case "create-folder":
      return translate("common.create");
    case "rename":
      return translate("common.rename");
    case "move":
      return translate("common.move");
    case "copy":
      return translate("common.copy");
    case "delete":
      return translate("common.delete");
    case "batch-download":
      return translate("dialog.createTask");
  }
}

// ─── Pure helpers (all unchanged) ───
export async function loadFiles(
  mountId: string,
  path: string,
  searchQuery: string,
  setEntries: (v: FileEntry[]) => void,
  setSelectedEntries: React.Dispatch<React.SetStateAction<FileEntry[]>>,
  showHidden: boolean,
) {
  const rows = await api.files(mountId, path, showHidden);
  setEntries(rows);
  if (!searchQuery)
    setSelectedEntries((prev) =>
      prev
        .map((i) => rows.find((r) => sameEntry(r, i)) ?? null)
        .filter((i): i is FileEntry => i !== null),
    );
}
export async function loadTree(
  mountId: string,
  path: string,
  showHidden: boolean,
  setTreeCache: React.Dispatch<
    React.SetStateAction<Record<string, FileTreeNode[]>>
  >,
) {
  const nodes = await api.tree(mountId, path, showHidden);
  setTreeCache((prev) => ({
    ...prev,
    [treeCacheKey(mountId, path, showHidden)]: nodes,
  }));
}
export function mergeTasks(prev: TransferTask[], next: TransferTask[]) {
  const m = new Map(prev.map((t) => [t.id, t]));
  next.forEach((t) => m.set(t.id, t));
  return Array.from(m.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}
export function basename(p: string) {
  return p.split("/").filter(Boolean).at(-1) ?? "";
}
export function dirname(p: string) {
  const parts = p.split("/").filter(Boolean);
  return parts.length <= 1 ? "/" : `/${parts.slice(0, -1).join("/")}`;
}
export function treeCacheKey(
  mountId: string,
  path: string,
  showHidden: boolean | string,
) {
  return `${mountId}:${typeof showHidden === "boolean" ? (showHidden ? "1" : "0") : showHidden}:${path}`;
}
export function extensionFromPath(p: string) {
  const n = basename(p);
  const i = n.lastIndexOf(".");
  return i <= 0 ? "" : n.slice(i).toLowerCase();
}
export function hasHiddenPath(p: string) {
  return p
    .split("/")
    .filter(Boolean)
    .some((s) => s.startsWith("."));
}
export function readStoredShowHidden() {
  return window.localStorage.getItem(SHOW_HIDDEN_STORAGE_KEY) === "1";
}
export function readStoredThemeMode(): ThemeMode {
  const r = window.localStorage.getItem(THEME_STORAGE_KEY);
  return r === "light" || r === "dark" || r === "system" ? r : "system";
}
export function readStoredViewMode(): ViewMode {
  const r = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return r === "list" ? "list" : "grid";
}
export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const media = window.matchMedia(q);
    const h = () => setM(media.matches);
    h();
    media.addEventListener("change", h);
    return () => media.removeEventListener("change", h);
  }, [q]);
  return m;
}
export function clearInspector(
  ref: React.MutableRefObject<number>,
  setP: React.Dispatch<React.SetStateAction<any>>,
  setE: React.Dispatch<React.SetStateAction<EditorDocument | null>>,
) {
  ref.current += 1;
  setP(null);
  setE(null);
}
export function sameEntry(
  l: Pick<FileEntry, "mountId" | "path">,
  r: Pick<FileEntry, "mountId" | "path">,
) {
  return l.mountId === r.mountId && l.path === r.path;
}
export function getSingleMountId(entries: FileEntry[]) {
  const ids = Array.from(new Set(entries.map((e) => e.mountId)));
  return ids.length === 1 ? ids[0] : "";
}
export function normalizeDirectory(p: string) {
  const t = p.trim();
  if (!t) return "";
  if (t === "/") return "/";
  const n = t.replace(/\/+$/, "");
  return n.startsWith("/") ? n : `/${n}`;
}
export function defaultTargetDir(
  entries: FileEntry[],
  currentMountId: string,
  currentPath: string,
) {
  const first = entries[0];
  if (!first) return currentPath;
  return first.mountId === currentMountId ? currentPath : dirname(first.path);
}
export function buildBreadcrumbs(
  currentMount: MountRoot | null,
  currentPath: string,
) {
  const parts = currentPath.split("/").filter(Boolean);
  const crumbs = [{ label: currentMount?.name ?? "Root", path: "/" }];
  let cursor = "";
  for (const part of parts) {
    cursor += `/${part}`;
    crumbs.push({ label: part, path: cursor });
  }
  return crumbs;
}
export function sortEntries(rows: FileEntry[]) {
  return [...rows].sort((l, r) => {
    if (l.isDir && !r.isDir) return -1;
    if (!l.isDir && r.isDir) return 1;
    return l.name.localeCompare(r.name, getDateLocale(), {
      numeric: true,
      sensitivity: "base",
    });
  });
}

export function pathLineage(path: string) {
  const normalized = normalizeDirectory(path) || "/";
  if (normalized === "/") {
    return ["/"];
  }
  const lineage = ["/"];
  let cursor = "";
  for (const part of normalized.split("/").filter(Boolean)) {
    cursor += `/${part}`;
    lineage.push(cursor);
  }
  return lineage;
}

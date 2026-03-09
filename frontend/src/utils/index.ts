import { api } from "@/api";
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

// ─── Dialog helpers ───
export function dialogEyebrow(kind: NonNullable<OperationDialog>["kind"]) {
  return kind === "delete"
    ? "Danger Zone"
    : kind === "batch-download"
      ? "Archive"
      : "Operation";
}
export function dialogTitle(d: NonNullable<OperationDialog>) {
  switch (d.kind) {
    case "create-folder":
      return "新建目录";
    case "rename":
      return `重命名 ${d.entry.name}`;
    case "move":
      return `移动 ${d.entries.length} 个项目`;
    case "copy":
      return `复制 ${d.entries.length} 个项目`;
    case "delete":
      return `删除 ${d.entries.length} 个项目`;
    case "batch-download":
      return `批量下载 ${d.entries.length} 个项目`;
  }
}
export function dialogDescription(d: NonNullable<OperationDialog>) {
  switch (d.kind) {
    case "create-folder":
      return "目录会创建在当前工作目录下。";
    case "rename":
      return "仅修改名称，不改变所在目录。";
    case "move":
      return "输入目标目录路径。";
    case "copy":
      return "输入目标目录路径。";
    case "delete":
      return "删除会进入垃圾桶，不会直接执行不可恢复删除。";
    case "batch-download":
      return "系统会在后台创建压缩包任务。";
  }
}
export function dialogFieldLabel(kind: NonNullable<OperationDialog>["kind"]) {
  switch (kind) {
    case "create-folder":
      return "目录名称";
    case "rename":
      return "新名称";
    case "move":
    case "copy":
      return "目标目录";
    case "batch-download":
      return "ZIP 文件名";
    case "delete":
      return "";
  }
}
export function dialogConfirmLabel(kind: NonNullable<OperationDialog>["kind"]) {
  switch (kind) {
    case "create-folder":
      return "创建";
    case "rename":
      return "保存名称";
    case "move":
      return "确认移动";
    case "copy":
      return "确认复制";
    case "delete":
      return "确认删除";
    case "batch-download":
      return "创建任务";
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
    return l.name.localeCompare(r.name, "zh-CN", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

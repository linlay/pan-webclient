import type {
  EditorDocument,
  FileEntry,
  FileTreeNode,
  MountRoot,
  PreviewMeta,
  SearchHit,
  SessionUser,
  TrashItem,
  TransferTask,
} from "../types/contracts/index";

const API_BASE = (process.env.REACT_APP_API_BASE_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function rawFileUrl(mountId: string, path: string) {
  const params = new URLSearchParams({ mountId, path });
  return `${API_BASE}/api/files/raw?${params.toString()}`;
}

function hiddenParams(showHidden: boolean) {
  return `showHidden=${showHidden ? "1" : "0"}`;
}

export const api = {
  login: (username: string, password: string) =>
    request<SessionUser>("/api/web/session/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/web/session/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  sessionMe: () => request<SessionUser>("/api/web/session/me"),
  mounts: () => request<MountRoot[]>("/api/mounts"),
  tree: (mountId: string, path: string, showHidden: boolean) =>
    request<FileTreeNode[]>(
      `/api/tree?mountId=${encodeURIComponent(mountId)}&path=${encodeURIComponent(path)}&${hiddenParams(showHidden)}`,
    ),
  files: (mountId: string, path: string, showHidden: boolean) =>
    request<FileEntry[]>(
      `/api/files?mountId=${encodeURIComponent(mountId)}&path=${encodeURIComponent(path)}&${hiddenParams(showHidden)}`,
    ),
  search: (query: string, showHidden: boolean) =>
    request<SearchHit[]>(`/api/search?q=${encodeURIComponent(query)}&${hiddenParams(showHidden)}`),
  preview: (mountId: string, path: string) =>
    request<PreviewMeta>(`/api/preview?mountId=${encodeURIComponent(mountId)}&path=${encodeURIComponent(path)}`),
  getContent: (mountId: string, path: string) =>
    request<EditorDocument>(`/api/files/content?mountId=${encodeURIComponent(mountId)}&path=${encodeURIComponent(path)}`),
  saveContent: (payload: { mountId: string; path: string; content: string; version: string }) =>
    request<EditorDocument>("/api/files/content", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  createFolder: (mountId: string, path: string, name: string) =>
    request<FileEntry>("/api/files/folder", {
      method: "POST",
      body: JSON.stringify({ mountId, path, name }),
    }),
  rename: (mountId: string, path: string, newName: string) =>
    request<FileEntry>("/api/files/rename", {
      method: "POST",
      body: JSON.stringify({ mountId, path, newName }),
    }),
  move: (mountId: string, path: string, targetDir: string) =>
    request<FileEntry>("/api/files/move", {
      method: "POST",
      body: JSON.stringify({ mountId, path, targetDir }),
    }),
  copy: (mountId: string, path: string, targetDir: string) =>
    request<FileEntry>("/api/files/copy", {
      method: "POST",
      body: JSON.stringify({ mountId, path, targetDir }),
    }),
  remove: (mountId: string, path: string) =>
    request<{ ok: boolean }>("/api/files/delete", {
      method: "POST",
      body: JSON.stringify({ mountId, path }),
    }),
  upload: async (mountId: string, path: string, files: FileList | File[]) => {
    const form = new FormData();
    form.set("mountId", mountId);
    form.set("path", path);
    Array.from(files).forEach((file) => form.append("files", file));
    const response = await fetch(`${API_BASE}/api/uploads`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? `${response.status} ${response.statusText}`);
    }
    return (await response.json()) as TransferTask;
  },
  tasks: () => request<TransferTask[]>("/api/tasks"),
  batchDownload: (mountId: string, items: string[], archiveName: string) =>
    request<TransferTask>("/api/downloads/batch", {
      method: "POST",
      body: JSON.stringify({ mountId, items, archiveName }),
    }),
  task: (id: string) => request<TransferTask>(`/api/tasks/${id}`),
  taskDownloadUrl: (id: string) => `${API_BASE}/api/tasks/${id}/download`,
  trash: () => request<TrashItem[]>("/api/trash"),
  restoreTrash: (ids: string[]) =>
    request<{ restored: number; conflicts: string[] }>("/api/trash/restore", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  deleteTrash: (ids: string[]) =>
    request<{ deleted: number; missing: string[] }>("/api/trash/delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
};

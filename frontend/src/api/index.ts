import type {
  EditorDocument,
  FileEntry,
  FileTreeNode,
  MountRoot,
  ManagedShare,
  PublicShare,
  PreviewMeta,
  SearchHit,
  SessionUser,
  ShareCreateResult,
  SharePermission,
  ShareWriteMode,
  TrashItem,
  TransferTask,
} from "../types/contracts/index";
import { getAppAccessToken, refreshAppAccessToken } from "./appAuth";
import { apiUrl, isAppMode } from "./routing";
import { uploadRequestErrorMessage } from "./uploadLimits";
import { translate } from "@/i18n";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return requestWithReplay<T>(path, init, true);
}

async function requestWithReplay<T>(
  path: string,
  init: RequestInit | undefined,
  allowReplay: boolean,
): Promise<T> {
  const appMode = isAppMode();
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (appMode) {
    let token = getAppAccessToken();
    if (!token) {
      token = await refreshAppAccessToken("missing");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(apiUrl(path), {
    credentials: appMode ? "omit" : "include",
    ...init,
    headers,
  });

  if (response.status === 401 && appMode && allowReplay) {
    const refreshedToken = await refreshAppAccessToken("unauthorized");
    if (refreshedToken) {
      return requestWithReplay<T>(path, init, false);
    }
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

type UploadProgress = {
  loaded: number;
  total: number;
};

export function rawFileUrl(mountId: string, path: string) {
  const params = new URLSearchParams({ mountId, path });
  return apiUrl(`/api/files/raw?${params.toString()}`);
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
  createShare: (
    mountId: string,
    path: string,
    access: "public" | "password",
    permission: SharePermission,
    writeMode: ShareWriteMode,
    description: string,
    expiresAt: number,
  ) =>
    request<ShareCreateResult>("/api/shares", {
      method: "POST",
      body: JSON.stringify({
        mountId,
        path,
        access,
        permission,
        writeMode,
        description,
        expiresAt,
      }),
    }),
  shares: () => request<ManagedShare[]>("/api/shares"),
  deleteShare: (shareId: string) =>
    request<{ ok: boolean }>(`/api/shares/${encodeURIComponent(shareId)}`, {
      method: "DELETE",
    }),
  publicShare: (shareId: string) =>
    request<PublicShare>(`/api/public/shares/${encodeURIComponent(shareId)}`),
  authorizeShare: (shareId: string, password: string) =>
    request<{ ok: boolean }>(
      `/api/public/shares/${encodeURIComponent(shareId)}/authorize`,
      {
        method: "POST",
        body: JSON.stringify({ password }),
      },
    ),
  publicShareFiles: (shareId: string, path: string) =>
    request<FileEntry[]>(
      `/api/public/shares/${encodeURIComponent(shareId)}/files?path=${encodeURIComponent(path)}`,
    ),
  publicSharePreview: (shareId: string, path: string) =>
    request<PreviewMeta>(
      `/api/public/shares/${encodeURIComponent(shareId)}/preview?path=${encodeURIComponent(path)}`,
    ),
  publicShareRawUrl: (shareId: string, path: string) =>
    apiUrl(
      `/api/public/shares/${encodeURIComponent(shareId)}/raw?path=${encodeURIComponent(path)}`,
    ),
  publicShareDownloadUrl: (shareId: string, path: string) =>
    apiUrl(
      `/api/public/shares/${encodeURIComponent(shareId)}/download?path=${encodeURIComponent(path)}`,
    ),
  savePublicShare: (
    shareId: string,
    path: string,
    mountId: string,
    targetDir: string,
  ) =>
    request<FileEntry>(
      `/api/public/shares/${encodeURIComponent(shareId)}/save`,
      {
        method: "POST",
        body: JSON.stringify({ path, mountId, targetDir }),
      },
    ),
  publicShareUpload: async (
    shareId: string,
    path: string,
    files: FileList | File[],
    onProgress?: (progress: UploadProgress) => void,
  ) => {
    const form = new FormData();
    const rows = Array.from(files);
    const fallbackTotal = rows.reduce((sum, file) => sum + file.size, 0);
    form.set("path", path);
    rows.forEach((file) => form.append("files", file));
    return new Promise<FileEntry[]>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open(
        "POST",
        apiUrl(`/api/public/shares/${encodeURIComponent(shareId)}/uploads`),
      );
      request.withCredentials = !isAppMode();
      request.responseType = "json";
      if (isAppMode()) {
        const token = getAppAccessToken();
        if (token) {
          request.setRequestHeader("Authorization", `Bearer ${token}`);
        }
      }
      request.upload.onprogress = (event) => {
        onProgress?.({
          loaded: event.loaded,
          total: event.lengthComputable ? event.total : fallbackTotal,
        });
      };
      request.onerror = () =>
        reject(new Error(translate("controller.errors.uploadFailed")));
      request.onload = () => {
        const response =
          request.response && typeof request.response === "object"
            ? request.response
            : (() => {
                try {
                  return JSON.parse(request.responseText || "null");
                } catch {
                  return null;
                }
              })();
        if (request.status >= 200 && request.status < 300) {
          resolve((response as FileEntry[] | null) ?? []);
          return;
        }
        reject(
          new Error(
            uploadRequestErrorMessage(
              request.status,
              request.statusText,
              response,
              request.responseText || "",
            ) || translate("controller.errors.uploadFailed"),
          ),
        );
      };
      request.send(form);
    });
  },
  upload: async (
    mountId: string,
    path: string,
    files: FileList | File[],
    onProgress?: (progress: UploadProgress) => void,
  ) => {
    const form = new FormData();
    const rows = Array.from(files);
    const fallbackTotal = rows.reduce((sum, file) => sum + file.size, 0);
    form.set("mountId", mountId);
    form.set("path", path);
    rows.forEach((file) => form.append("files", file));
    return new Promise<TransferTask>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", apiUrl("/api/uploads"));
      request.withCredentials = !isAppMode();
      request.responseType = "json";
      if (isAppMode()) {
        const token = getAppAccessToken();
        if (token) {
          request.setRequestHeader("Authorization", `Bearer ${token}`);
        }
      }
      request.upload.onprogress = (event) => {
        onProgress?.({
          loaded: event.loaded,
          total: event.lengthComputable ? event.total : fallbackTotal,
        });
      };
      request.onerror = () =>
        reject(new Error(translate("controller.errors.uploadFailed")));
      request.onload = () => {
        const response =
          request.response && typeof request.response === "object"
            ? request.response
            : (() => {
                try {
                  return JSON.parse(request.responseText || "null");
                } catch {
                  return null;
                }
              })();
        if (request.status >= 200 && request.status < 300) {
          resolve(response as TransferTask);
          return;
        }
        reject(
          new Error(
            uploadRequestErrorMessage(
              request.status,
              request.statusText,
              response,
              request.responseText || "",
            ) || translate("controller.errors.uploadFailed"),
          ),
        );
      };
      request.send(form);
    });
  },
  tasks: () => request<TransferTask[]>("/api/tasks"),
  batchDownload: (mountId: string, items: string[], archiveName: string) =>
    request<TransferTask>("/api/downloads/batch", {
      method: "POST",
      body: JSON.stringify({ mountId, items, archiveName }),
    }),
  task: (id: string) => request<TransferTask>(`/api/tasks/${id}`),
  deleteTask: (id: string) =>
    request<{ ok: boolean }>(`/api/tasks/${id}`, {
      method: "DELETE",
    }),
  taskDownloadUrl: (id: string) => apiUrl(`/api/tasks/${id}/download`),
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

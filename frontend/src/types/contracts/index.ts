export type PreviewKind =
  | "directory"
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "markdown"
  | "text"
  | "download"
  | "unknown";

export interface MountRoot {
  id: string;
  name: string;
  path: string;
}

export interface FileEntry {
  mountId: string;
  path: string;
  name: string;
  isDir: boolean;
  size: number;
  modTime: number;
  mime: string;
  extension: string;
}

export interface FileTreeNode {
  mountId: string;
  path: string;
  name: string;
  hasChildren: boolean;
}

export interface PreviewMeta {
  mountId: string;
  path: string;
  name: string;
  kind: PreviewKind;
  mime: string;
  size: number;
  modTime: number;
  content?: string;
  streamUrl?: string;
}

export interface EditorDocument {
  mountId: string;
  path: string;
  name: string;
  content: string;
  language: string;
  version: string;
}

export interface TransferTask {
  id: string;
  kind: "upload" | "download";
  status: "pending" | "running" | "success" | "failed";
  detail: string;
  items?: TransferTaskItem[];
  totalBytes?: number;
  completedBytes?: number;
  downloadUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TransferTaskItem {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
}

export interface TrashItem {
  id: string;
  mountId: string;
  originalPath: string;
  trashPath: string;
  deletedAt: number;
  isDir: boolean;
  size: number;
  name: string;
}

export interface SearchHit {
  mountId: string;
  path: string;
  name: string;
  isDir: boolean;
  size: number;
  modTime: number;
  mime: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface SessionUser {
  username: string;
  authMethod: "session" | "token";
}

export type ShareAccess = "public" | "password";
export type SharePermission = "read" | "write";
export type ShareWriteMode = "local" | "text";

export interface ShareCreateResult {
  id: string;
  name: string;
  isDir: boolean;
  access: ShareAccess;
  permission: SharePermission;
  writeMode: ShareWriteMode;
  description?: string;
  expiresAt: number;
  password?: string;
  urlPath: string;
}

export interface ManagedShare {
  id: string;
  mountId: string;
  path: string;
  name: string;
  isDir: boolean;
  access: ShareAccess;
  permission: SharePermission;
  writeMode: ShareWriteMode;
  description?: string;
  password?: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
  expired: boolean;
  urlPath: string;
}

export interface PublicShare {
  id: string;
  name: string;
  isDir: boolean;
  access: ShareAccess;
  permission: SharePermission;
  writeMode: ShareWriteMode;
  description?: string;
  requiresPassword: boolean;
  authorized: boolean;
  expiresAt: number;
  preview?: PreviewMeta;
  entries?: FileEntry[];
}

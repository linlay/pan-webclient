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
  downloadUrl?: string;
  createdAt: number;
  updatedAt: number;
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

import { FileEntry } from "../contracts";

export type Notice = { tone: "info" | "error"; text: string } | null;
export type ThemeMode = "system" | "light" | "dark";
export type InspectorMode = "preview" | "editor" | "tasks" | "trash";
export type ViewMode = "grid" | "list";
export type DialogBase = { error: string; submitting: boolean };
export type OperationDialog =
  | ({ kind: "create-folder"; value: string } & DialogBase)
  | ({ kind: "rename"; entry: FileEntry; value: string } & DialogBase)
  | ({
    kind: "move" | "copy";
    entries: FileEntry[];
    targetDir: string;
  } & DialogBase)
  | ({ kind: "delete"; entries: FileEntry[] } & DialogBase)
  | ({
    kind: "batch-download";
    entries: FileEntry[];
    value: string;
  } & DialogBase)
  | null;

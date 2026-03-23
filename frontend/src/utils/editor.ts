import type { FileEntry } from "@/types/contracts";
import { translate } from "@/i18n";

export function emptyEditorTitle(
  selectionCount: number,
  activeEntry: FileEntry | null,
) {
  if (selectionCount > 1) return translate("editor.empty.multiTitle");
  if (activeEntry?.isDir) return translate("editor.empty.dirTitle");
  if (activeEntry) return translate("editor.empty.previewOnlyTitle");
  return translate("editor.empty.idleTitle");
}

export function emptyEditorDescription(
  selectionCount: number,
  activeEntry: FileEntry | null,
) {
  if (selectionCount > 1)
    return translate("editor.empty.multiDescription");
  if (activeEntry?.isDir)
    return translate("editor.empty.dirDescription");
  if (activeEntry) return translate("editor.empty.previewOnlyDescription");
  return translate("editor.empty.idleDescription");
}

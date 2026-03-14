import type { FileEntry } from "@/types/contracts";

export function emptyEditorTitle(
  selectionCount: number,
  activeEntry: FileEntry | null,
) {
  if (selectionCount > 1) return "批量选择不进入编辑模式";
  if (activeEntry?.isDir) return "目录不可直接编辑";
  if (activeEntry) return "该文件当前仅支持预览";
  return "选择文本文件进入编辑";
}

export function emptyEditorDescription(
  selectionCount: number,
  activeEntry: FileEntry | null,
) {
  if (selectionCount > 1)
    return "先收敛到单个文本或 Markdown 文件，再在这里修改内容。";
  if (activeEntry?.isDir)
    return "目录不会进入编辑状态；单击目录会直接进入该层级。";
  if (activeEntry) return "现阶段只支持文本类文件和 Markdown 的在线编辑。";
  return "支持纯文本、Markdown，以及后端当前已识别的其它文本类型。";
}

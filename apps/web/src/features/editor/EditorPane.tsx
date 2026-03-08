import { useEffect, useState } from "react";
import type { EditorDocument, FileEntry } from "../../../../../packages/contracts/index";

export function EditorPane(props: {
  editor: EditorDocument | null;
  activeEntry: FileEntry | null;
  selectionCount: number;
  onSave: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setContent(props.editor?.content ?? "");
    setError("");
  }, [props.editor]);

  if (!props.editor) {
    return (
      <section className="panel-card editor-card">
        <div className="panel-heading">
          <div>
            <span>编辑器</span>
            <strong>只读或未选择</strong>
          </div>
        </div>
        <div className="preview-placeholder slim">
          <strong>{emptyTitle(props.selectionCount, props.activeEntry)}</strong>
          <p>{emptyDescription(props.selectionCount, props.activeEntry)}</p>
        </div>
      </section>
    );
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await props.onSave(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const lineCount = content.split("\n").length;

  return (
    <section className="panel-card editor-card">
      <div className="panel-heading">
        <div>
          <span>编辑器</span>
          <strong>{props.editor.name}</strong>
        </div>
        <div className="toolbar">
          <small className="pill-label">{props.editor.language}</small>
          <button className="primary-button compact-button" onClick={() => void save()} type="button">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      <div className="editor-meta">
        <span>{lineCount} 行</span>
        <span>{content.length} 字符</span>
      </div>

      {error ? <div className="notice notice-error">{error}</div> : null}

      <div className="editor-shell">
        <textarea
          className="editor-textarea"
          onChange={(event) => setContent(event.target.value)}
          spellCheck={false}
          value={content}
        />
      </div>
    </section>
  );
}

function emptyTitle(selectionCount: number, activeEntry: FileEntry | null) {
  if (selectionCount > 1) {
    return "批量选择不进入编辑模式";
  }

  if (activeEntry?.isDir) {
    return "目录不可直接编辑";
  }

  if (activeEntry) {
    return "该文件当前仅支持预览";
  }

  return "选择文本文件进入编辑";
}

function emptyDescription(selectionCount: number, activeEntry: FileEntry | null) {
  if (selectionCount > 1) {
    return "先收敛到单个文本或 Markdown 文件，再在这里修改内容。";
  }

  if (activeEntry?.isDir) {
    return "目录会在上方显示摘要信息，双击后可进入目录内部继续浏览。";
  }

  if (activeEntry) {
    return "现阶段只支持文本类文件和 Markdown 的在线编辑。";
  }

  return "支持纯文本、Markdown，以及后端当前已识别的其它文本类型。";
}

import { useEffect, useState } from "react";
import type { EditorDocument } from "../../../../../packages/contracts/index";

export function EditorPane(props: {
  editor: EditorDocument | null;
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
      <section className="panel-card">
        <div className="panel-heading">
          <span>编辑器</span>
        </div>
        <div className="empty-state compact">文本与 Markdown 文件会在这里打开。</div>
      </section>
    );
  }

  const isMarkdown = props.editor.language === "markdown";

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

  return (
    <section className="panel-card editor-card">
      <div className="panel-heading">
        <span>编辑器</span>
        <div className="toolbar">
          <small>{props.editor.language}</small>
          <button className="tiny-button accent" onClick={() => void save()}>
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
      {error ? <div className="notice notice-error">{error}</div> : null}
      <div className={`editor-grid ${isMarkdown ? "is-markdown" : ""}`}>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} />
        {isMarkdown ? (
          <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        ) : null}
      </div>
    </section>
  );
}

function renderMarkdown(source: string) {
  const lines = source.split("\n");
  const html = lines
    .map((line) => {
      const escaped = escapeHtml(line);
      if (escaped.startsWith("### ")) return `<h3>${escaped.slice(4)}</h3>`;
      if (escaped.startsWith("## ")) return `<h2>${escaped.slice(3)}</h2>`;
      if (escaped.startsWith("# ")) return `<h1>${escaped.slice(2)}</h1>`;
      if (escaped.startsWith("- ")) return `<li>${escaped.slice(2)}</li>`;
      if (escaped.startsWith("> ")) return `<blockquote>${escaped.slice(2)}</blockquote>`;
      return `<p>${escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")}</p>`;
    })
    .join("");
  return html.replace(/(<li>.*?<\/li>)+/g, (segment) => `<ul>${segment}</ul>`);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

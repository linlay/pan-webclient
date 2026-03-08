import type { FileEntry, MountRoot, PreviewMeta } from "../../../../../packages/contracts/index";
import { rawFileUrl } from "../../app/api";
import { renderMarkdown } from "../shared/markdown";

export function PreviewPane(props: {
  preview: PreviewMeta | null;
  activeEntry: FileEntry | null;
  selectedEntries: FileEntry[];
  currentMount: MountRoot | null;
  currentPath: string;
  searchQuery: string;
}) {
  const entry = props.activeEntry;

  if (props.selectedEntries.length > 1) {
    return (
      <section className="panel-card inspector-card">
        <div className="panel-heading">
          <div>
            <span>检查栏</span>
            <strong>{props.selectedEntries.length} 个项目已选中</strong>
          </div>
        </div>
        <div className="summary-stack">
          <p className="muted">
            批量选择时不会自动加载预览。可以直接执行移动、复制、删除或批量下载操作。
          </p>
          <div className="selection-list">
            {props.selectedEntries.slice(0, 5).map((item) => (
              <span className="selection-pill" key={`${item.mountId}:${item.path}`}>
                {item.name}
              </span>
            ))}
            {props.selectedEntries.length > 5 ? (
              <span className="selection-pill muted">+{props.selectedEntries.length - 5}</span>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (entry?.isDir) {
    return (
      <section className="panel-card inspector-card">
        <div className="panel-heading">
          <div>
            <span>目录摘要</span>
            <strong>{entry.name}</strong>
          </div>
          <span className="entry-badge is-directory">DIR</span>
        </div>

        <dl className="meta-grid">
          <div>
            <dt>挂载点</dt>
            <dd>{props.currentMount?.name ?? entry.mountId}</dd>
          </div>
          <div>
            <dt>路径</dt>
            <dd>{entry.path}</dd>
          </div>
          <div>
            <dt>修改时间</dt>
            <dd>{formatDateTime(entry.modTime)}</dd>
          </div>
          <div>
            <dt>类型</dt>
            <dd>文件夹</dd>
          </div>
        </dl>

        <div className="preview-placeholder">
          <strong>目录已选中</strong>
          <p>双击目录进入，或继续多选后执行批量操作。</p>
        </div>
      </section>
    );
  }

  if (!entry || !props.preview) {
    return (
      <section className="panel-card inspector-card">
        <div className="panel-heading">
          <div>
            <span>检查栏</span>
            <strong>{props.currentMount?.name ?? "未选择挂载点"}</strong>
          </div>
        </div>

        <dl className="meta-grid">
          <div>
            <dt>当前位置</dt>
            <dd>{props.searchQuery ? `搜索：${props.searchQuery}` : props.currentPath}</dd>
          </div>
          <div>
            <dt>模式</dt>
            <dd>{props.searchQuery ? "搜索结果" : "目录浏览"}</dd>
          </div>
        </dl>

        <div className="preview-placeholder">
          <strong>选择一个项目查看详情</strong>
          <p>单击文件可在右侧预览，双击目录可进入下一层。</p>
        </div>
      </section>
    );
  }

  const streamUrl = props.preview.streamUrl ?? rawFileUrl(props.preview.mountId, props.preview.path);

  return (
    <section className="panel-card inspector-card">
      <div className="panel-heading">
        <div>
          <span>预览</span>
          <strong>{props.preview.name}</strong>
        </div>
        <span className={`entry-badge ${props.preview.kind === "directory" ? "is-directory" : ""}`}>
          {badgeFromPreview(props.preview)}
        </span>
      </div>

      <dl className="meta-grid">
        <div>
          <dt>类型</dt>
          <dd>{describePreviewKind(props.preview.kind, props.preview.mime)}</dd>
        </div>
        <div>
          <dt>大小</dt>
          <dd>{formatBytes(props.preview.size)}</dd>
        </div>
        <div>
          <dt>修改时间</dt>
          <dd>{formatDateTime(props.preview.modTime)}</dd>
        </div>
        <div>
          <dt>位置</dt>
          <dd>{props.preview.path}</dd>
        </div>
      </dl>

      <div className="preview-frame">
        {props.preview.kind === "image" ? <img alt={props.preview.name} src={streamUrl} /> : null}
        {props.preview.kind === "pdf" ? <iframe src={streamUrl} title={props.preview.name} /> : null}
        {props.preview.kind === "audio" ? <audio controls src={streamUrl} /> : null}
        {props.preview.kind === "video" ? <video controls src={streamUrl} /> : null}
        {props.preview.kind === "text" ? <pre>{props.preview.content}</pre> : null}
        {props.preview.kind === "markdown" ? (
          <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(props.preview.content ?? "") }} />
        ) : null}
        {props.preview.kind === "download" ? (
          <div className="preview-placeholder">
            <strong>当前类型仅支持下载</strong>
            <p>{props.preview.mime || "未知文件类型"} 暂不提供浏览器内预览。</p>
            <a className="primary-button inline-button" href={streamUrl} rel="noreferrer" target="_blank">
              下载文件
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function badgeFromPreview(preview: PreviewMeta) {
  if (preview.kind === "markdown") {
    return "MD";
  }

  if (preview.kind === "text") {
    return "TXT";
  }

  if (preview.kind === "download") {
    return "FILE";
  }

  return preview.kind.toUpperCase();
}

function describePreviewKind(kind: PreviewMeta["kind"], mime: string) {
  if (kind === "markdown") {
    return "Markdown";
  }

  if (kind === "text") {
    return "文本";
  }

  if (kind === "download") {
    return mime || "文件";
  }

  if (kind === "image") {
    return "图片";
  }

  if (kind === "audio") {
    return "音频";
  }

  if (kind === "video") {
    return "视频";
  }

  if (kind === "pdf") {
    return "PDF";
  }

  return kind;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDateTime(value: number) {
  return new Date(value * 1000).toLocaleString();
}

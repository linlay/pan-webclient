import type { FileEntry, MountRoot, PreviewMeta } from "../../../../../packages/contracts/index";
import { rawFileUrl } from "../../app/api";
import { IconDownload, IconEdit, IconFolder } from "../shared/Icons";
import { renderMarkdown } from "../shared/markdown";

export function PreviewPane(props: {
  preview: PreviewMeta | null;
  activeEntry: FileEntry | null;
  selectedEntries: FileEntry[];
  currentMount: MountRoot | null;
  currentPath: string;
  searchQuery: string;
  canEdit: boolean;
  onEnterEdit: () => void;
  onShowTasks: () => void;
  taskCount: number;
}) {
  const entry = props.activeEntry;

  if (props.selectedEntries.length > 1) {
    return (
      <section className="panel-card inspector-card">
        <div className="panel-heading">
          <div>
            <span>当前选择</span>
            <strong>{props.selectedEntries.length} 项</strong>
          </div>
          {props.taskCount > 0 ? (
            <button className="ghost-button compact-button" onClick={props.onShowTasks} type="button">
              任务 {props.taskCount}
            </button>
          ) : null}
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
            <span>文件夹</span>
            <strong>{entry.name}</strong>
          </div>
          <div className="toolbar">
            {props.taskCount > 0 ? (
              <button className="ghost-button compact-button" onClick={props.onShowTasks} type="button">
                任务 {props.taskCount}
              </button>
            ) : null}
            <span className="entry-badge is-directory">
              <IconFolder size={14} />
            </span>
          </div>
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
          <p>单击目录会直接进入，也可以通过行尾菜单执行移动、复制、删除或下载。</p>
        </div>
      </section>
    );
  }

  if (!entry || !props.preview) {
    return (
      <section className="panel-card inspector-card">
        <div className="panel-heading">
          <div>
            <span>工作区概览</span>
            <strong>{props.currentMount?.name ?? "未选择挂载点"}</strong>
          </div>
          {props.taskCount > 0 ? (
            <button className="ghost-button compact-button" onClick={props.onShowTasks} type="button">
              任务 {props.taskCount}
            </button>
          ) : null}
        </div>

        <div className="preview-placeholder">
          <strong>选择一个项目查看详情</strong>
          <p>{props.searchQuery ? `当前正在搜索 “${props.searchQuery}”` : `当前位置 ${props.currentPath}`}</p>
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
        <div className="toolbar">
          {props.canEdit ? (
            <button className="primary-button compact-button" onClick={props.onEnterEdit} type="button">
              <IconEdit size={14} />
              编辑
            </button>
          ) : null}
          {props.taskCount > 0 ? (
            <button className="ghost-button compact-button" onClick={props.onShowTasks} type="button">
              任务 {props.taskCount}
            </button>
          ) : null}
          <span className={`entry-badge ${props.preview.kind === "directory" ? "is-directory" : ""}`}>
            {badgeFromPreview(props.preview)}
          </span>
        </div>
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
              <IconDownload size={14} />
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

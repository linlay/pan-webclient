import type { PreviewMeta } from "../../../../../packages/contracts/index";
import { rawFileUrl } from "../../app/api";

export function PreviewPane({ preview }: { preview: PreviewMeta | null }) {
  if (!preview) {
    return (
      <section className="panel-card">
        <div className="panel-heading">
          <span>预览</span>
        </div>
        <div className="empty-state compact">双击文件以打开预览。</div>
      </section>
    );
  }

  const streamUrl = preview.streamUrl ?? rawFileUrl(preview.mountId, preview.path);

  return (
    <section className="panel-card">
      <div className="panel-heading">
        <span>预览</span>
        <strong>{preview.name}</strong>
      </div>
      <div className="preview-frame">
        {preview.kind === "image" ? <img alt={preview.name} src={streamUrl} /> : null}
        {preview.kind === "pdf" ? <iframe src={streamUrl} title={preview.name} /> : null}
        {preview.kind === "audio" ? <audio controls src={streamUrl} /> : null}
        {preview.kind === "video" ? <video controls src={streamUrl} /> : null}
        {preview.kind === "text" || preview.kind === "markdown" ? <pre>{preview.content}</pre> : null}
        {preview.kind === "download" ? (
          <a className="primary-button inline-button" href={streamUrl} rel="noreferrer" target="_blank">
            下载文件
          </a>
        ) : null}
      </div>
    </section>
  );
}

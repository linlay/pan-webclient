import type { FileEntry } from "../../../../../packages/contracts/index";

export function FileTable(props: {
  entries: FileEntry[];
  selectedEntries: FileEntry[];
  showPath: boolean;
  onInspect: (entry: FileEntry) => void;
  onOpen: (entry: FileEntry) => void;
  onToggleSelection: (entry: FileEntry) => void;
}) {
  return (
    <section className="file-table">
      <div className="file-table-head" role="row">
        <span className="file-col-select" />
        <span className="file-col-name">名称</span>
        <span className="file-col-date">修改时间</span>
        <span className="file-col-type">类型</span>
        <span className="file-col-size">大小</span>
      </div>

      <div className="file-table-body">
        {props.entries.map((entry) => {
          const selected = props.selectedEntries.some(
            (item) => item.mountId === entry.mountId && item.path === entry.path,
          );
          return (
            <div
              className={`file-row ${selected ? "is-selected" : ""}`}
              key={`${entry.mountId}:${entry.path}`}
              onDoubleClick={() => props.onOpen(entry)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  props.onOpen(entry);
                }
                if (event.key === " ") {
                  event.preventDefault();
                  props.onInspect(entry);
                }
              }}
              onClick={() => props.onInspect(entry)}
              role="button"
              tabIndex={0}
            >
              <button
                aria-label={selected ? `取消选中 ${entry.name}` : `选中 ${entry.name}`}
                aria-pressed={selected}
                className={`row-selector ${selected ? "is-selected" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onToggleSelection(entry);
                }}
                type="button"
              >
                <span />
              </button>

              <div className="file-row-name">
                <span className={`entry-badge ${entry.isDir ? "is-directory" : ""}`}>{badgeLabel(entry)}</span>
                <span className="file-row-namecopy">
                  <strong>{entry.name}</strong>
                  {props.showPath ? <small>{entry.path}</small> : null}
                </span>
              </div>

              <span className="file-row-date">{formatDateTime(entry.modTime)}</span>
              <span className="file-row-type">{describeMime(entry.mime, entry.isDir)}</span>
              <span className="file-row-size">{entry.isDir ? "DIR" : formatBytes(entry.size)}</span>
            </div>
          );
        })}

        {props.entries.length === 0 ? (
          <div className="empty-state table-empty">
            <strong>当前没有可展示的项目</strong>
            <p>可以切换目录、清空搜索条件，或直接上传文件。</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function badgeLabel(entry: FileEntry) {
  if (entry.isDir) {
    return "DIR";
  }

  const extension = entry.extension.replace(".", "").toUpperCase();
  return extension || "FILE";
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

function describeMime(value: string, isDir: boolean) {
  if (isDir || value === "inode/directory") {
    return "文件夹";
  }

  return value.replace("application/", "").replace("text/", "") || "文件";
}

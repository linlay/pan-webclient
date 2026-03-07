import type { FileEntry } from "../../../../../packages/contracts/index";

export function FileTable(props: {
  entries: FileEntry[];
  selectedEntries: FileEntry[];
  onSelect: (items: FileEntry[]) => void;
  onOpen: (entry: FileEntry) => void;
}) {
  function toggle(entry: FileEntry) {
    const key = `${entry.mountId}:${entry.path}`;
    const existing = props.selectedEntries.find((item) => `${item.mountId}:${item.path}` === key);
    if (existing) {
      props.onSelect(props.selectedEntries.filter((item) => `${item.mountId}:${item.path}` !== key));
      return;
    }
    props.onSelect([...props.selectedEntries, entry]);
  }

  return (
    <div className="file-table">
      <div className="file-head">
        <span>名称</span>
        <span>类型</span>
        <span>大小</span>
        <span>修改时间</span>
      </div>
      <div className="file-body">
        {props.entries.map((entry) => (
          <button
            className={`file-row ${
              props.selectedEntries.some((item) => item.mountId === entry.mountId && item.path === entry.path)
                ? "is-selected"
                : ""
            }`}
            key={`${entry.mountId}:${entry.path}`}
            onClick={() => toggle(entry)}
            onDoubleClick={() => props.onOpen(entry)}
          >
            <span className="file-name">
              <strong>{entry.isDir ? "DIR" : entry.extension.replace(".", "").toUpperCase() || "FILE"}</strong>
              {entry.name}
            </span>
            <span>{entry.isDir ? "Folder" : entry.mime}</span>
            <span>{entry.isDir ? "—" : formatBytes(entry.size)}</span>
            <span>{new Date(entry.modTime * 1000).toLocaleString()}</span>
          </button>
        ))}
        {props.entries.length === 0 ? <div className="empty-state">当前没有可展示的项目。</div> : null}
      </div>
    </div>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

import type { FileEntry } from "../../../../../packages/contracts/index";
import {
  IconAudio,
  IconCopy,
  IconDownload,
  IconEdit,
  IconFile,
  IconFolder,
  IconImage,
  IconMore,
  IconMove,
  IconTrash,
  IconVideo,
} from "../shared/Icons";
import { MenuButton } from "../shared/MenuButton";

export function FileTable(props: {
  entries: FileEntry[];
  selectedEntries: FileEntry[];
  showPath: boolean;
  onActivate: (entry: FileEntry) => void;
  onToggleSelection: (entry: FileEntry) => void;
  onRename: (entry: FileEntry) => void;
  onMove: (entry: FileEntry) => void;
  onCopy: (entry: FileEntry) => void;
  onDelete: (entry: FileEntry) => void;
  onDownload: (entry: FileEntry) => void;
}) {
  return (
    <section className="file-table">
      <div className="file-table-body">
        {props.entries.map((entry) => {
          const selected = props.selectedEntries.some(
            (item) => item.mountId === entry.mountId && item.path === entry.path,
          );
          return (
            <div
              className={`file-row ${selected ? "is-selected" : ""}`}
              key={`${entry.mountId}:${entry.path}`}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  props.onActivate(entry);
                }
                if (event.key === " ") {
                  event.preventDefault();
                  props.onToggleSelection(entry);
                }
              }}
              onClick={() => props.onActivate(entry)}
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

              <div className="file-row-main">
                <span className="file-icon">{entryIcon(entry)}</span>
                <div className="file-row-namecopy">
                  <strong>{entry.name}</strong>
                  <small>{props.showPath ? entry.path : describeEntry(entry)}</small>
                </div>
              </div>

              <div className="file-row-meta">
                <span>{formatDateTime(entry.modTime)}</span>
                <span>{entry.isDir ? "文件夹" : formatBytes(entry.size)}</span>
              </div>

              <MenuButton
                actions={[
                  { label: "重命名", icon: <IconEdit size={14} />, disabled: false, onSelect: () => props.onRename(entry) },
                  { label: "移动", icon: <IconMove size={14} />, onSelect: () => props.onMove(entry) },
                  { label: "复制", icon: <IconCopy size={14} />, onSelect: () => props.onCopy(entry) },
                  { label: "下载", icon: <IconDownload size={14} />, onSelect: () => props.onDownload(entry) },
                  { label: "删除", icon: <IconTrash size={14} />, danger: true, onSelect: () => props.onDelete(entry) },
                ]}
                buttonClassName="icon-button"
                buttonContent={<IconMore />}
                buttonLabel={`${entry.name} 操作`}
              />
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

function entryIcon(entry: FileEntry) {
  if (entry.isDir) {
    return <IconFolder />;
  }
  if (entry.mime.startsWith("image/")) {
    return <IconImage />;
  }
  if (entry.mime.startsWith("video/")) {
    return <IconVideo />;
  }
  if (entry.mime.startsWith("audio/")) {
    return <IconAudio />;
  }
  return <IconFile />;
}

function describeEntry(entry: FileEntry) {
  if (entry.isDir) {
    return "文件夹";
  }
  return entry.mime.replace("application/", "").replace("text/", "") || "文件";
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

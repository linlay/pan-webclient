import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type {
  EditorDocument,
  FileEntry,
  FileTreeNode,
  MountRoot,
  PreviewMeta,
  SearchHit,
  SessionUser,
  TransferTask,
} from "../../../../packages/contracts/index";
import { api } from "./api";
import { LoginForm } from "../features/auth/LoginForm";
import { SidebarTree } from "../features/files/SidebarTree";
import { FileTable } from "../features/files/FileTable";
import { PreviewPane } from "../features/preview/PreviewPane";
import { EditorPane } from "../features/editor/EditorPane";
import { TaskPanel } from "../features/tasks/TaskPanel";

type Notice = { tone: "info" | "error"; text: string } | null;

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [mounts, setMounts] = useState<MountRoot[]>([]);
  const [currentMountId, setCurrentMountId] = useState("");
  const [currentPath, setCurrentPath] = useState("/");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<FileEntry[]>([]);
  const [treeCache, setTreeCache] = useState<Record<string, FileTreeNode[]>>({});
  const [expandedPaths, setExpandedPaths] = useState<string[]>(["/"]);
  const [preview, setPreview] = useState<PreviewMeta | null>(null);
  const [editor, setEditor] = useState<EditorDocument | null>(null);
  const [tasks, setTasks] = useState<TransferTask[]>([]);
  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText);
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleRows = useMemo(() => {
    if (deferredSearch.trim()) {
      return searchResults.map((hit) => ({
        mountId: hit.mountId,
        path: hit.path,
        name: hit.name,
        isDir: hit.isDir,
        size: hit.size,
        modTime: hit.modTime,
        mime: hit.mime,
        extension: "",
      }));
    }
    return entries;
  }, [deferredSearch, entries, searchResults]);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!user || !currentMountId) {
      return;
    }
    void loadFiles(currentMountId, currentPath);
    void loadTree(currentMountId, currentPath);
  }, [user, currentMountId, currentPath]);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (!deferredSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void api
        .search(deferredSearch.trim())
        .then(setSearchResults)
        .catch((error: Error) => setNotice({ tone: "error", text: error.message }));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [deferredSearch, user]);

  useEffect(() => {
    if (!tasks.length) {
      return;
    }
    const active = tasks.filter((task) => task.status === "pending" || task.status === "running");
    if (!active.length) {
      return;
    }
    const handle = window.setInterval(() => {
      void Promise.all(active.map((task) => api.task(task.id)))
        .then((next) => {
          setTasks((previous) => mergeTasks(previous, next));
        })
        .catch((error: Error) => setNotice({ tone: "error", text: error.message }));
    }, 1500);
    return () => window.clearInterval(handle);
  }, [tasks]);

  async function bootstrap() {
    try {
      const me = await api.sessionMe();
      setUser(me);
      await loadMountBootstrap();
    } catch {
      setUser(null);
    } finally {
      setLoadingSession(false);
    }
  }

  async function loadMountBootstrap() {
    const list = await api.mounts();
    setMounts(list);
    if (list.length > 0) {
      setCurrentMountId((existing) => existing || list[0].id);
      setCurrentPath("/");
    }
  }

  async function loadFiles(mountId: string, path: string) {
    const rows = await api.files(mountId, path);
    setEntries(rows);
    setSelectedEntries([]);
  }

  async function loadTree(mountId: string, path: string) {
    const nodes = await api.tree(mountId, path);
    setTreeCache((previous) => ({ ...previous, [`${mountId}:${path}`]: nodes }));
  }

  async function handleLogin(username: string, password: string) {
    const me = await api.login(username, password);
    setUser(me);
    setNotice({ tone: "info", text: "登录成功" });
    await loadMountBootstrap();
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setEntries([]);
    setPreview(null);
    setEditor(null);
  }

  async function handleOpen(entry: FileEntry) {
    if (entry.isDir) {
      setCurrentMountId(entry.mountId);
      setCurrentPath(entry.path);
      setPreview(null);
      setEditor(null);
      return;
    }
    const data = await api.preview(entry.mountId, entry.path);
    setPreview(data);
    if (data.kind === "text" || data.kind === "markdown") {
      const doc = await api.getContent(entry.mountId, entry.path);
      setEditor(doc);
    } else {
      setEditor(null);
    }
  }

  async function refreshCurrentView() {
    if (!currentMountId) {
      return;
    }
    await Promise.all([loadFiles(currentMountId, currentPath), loadTree(currentMountId, currentPath)]);
  }

  async function handleCreateFolder() {
    const name = window.prompt("新建文件夹名称");
    if (!name || !currentMountId) {
      return;
    }
    await api.createFolder(currentMountId, currentPath, name);
    await refreshCurrentView();
    setNotice({ tone: "info", text: `已创建 ${name}` });
  }

  async function handleRename() {
    if (selectedEntries.length !== 1) {
      setNotice({ tone: "error", text: "请选择一个文件或目录重命名" });
      return;
    }
    const current = selectedEntries[0];
    const nextName = window.prompt("新的名称", basename(current.path));
    if (!nextName) {
      return;
    }
    await api.rename(current.mountId, current.path, nextName);
    await refreshCurrentView();
    setNotice({ tone: "info", text: "重命名成功" });
  }

  async function handleMoveCopy(kind: "move" | "copy") {
    if (!selectedEntries.length) {
      setNotice({ tone: "error", text: "请先选择文件或目录" });
      return;
    }
    const selectionMountId = requireSingleMountSelection();
    if (!selectionMountId) {
      return;
    }
    const targetDir = window.prompt(`输入${kind === "move" ? "移动" : "复制"}目标目录`, currentPath);
    if (!targetDir) {
      return;
    }
    for (const selected of selectedEntries) {
      if (kind === "move") {
        await api.move(selectionMountId, selected.path, targetDir);
      } else {
        await api.copy(selectionMountId, selected.path, targetDir);
      }
    }
    await refreshCurrentView();
    setNotice({ tone: "info", text: kind === "move" ? "移动完成" : "复制完成" });
  }

  async function handleDelete() {
    if (!selectedEntries.length) {
      setNotice({ tone: "error", text: "请先选择文件或目录" });
      return;
    }
    const selectionMountId = requireSingleMountSelection();
    if (!selectionMountId) {
      return;
    }
    if (!window.confirm(`确认将 ${selectedEntries.length} 个项目移入回收目录？`)) {
      return;
    }
    for (const selected of selectedEntries) {
      await api.remove(selectionMountId, selected.path);
    }
    await refreshCurrentView();
    setPreview(null);
    setEditor(null);
    setNotice({ tone: "info", text: "已移入回收目录" });
  }

  async function handleUpload(files: FileList | null) {
    if (!files || !currentMountId) {
      return;
    }
    const task = await api.upload(currentMountId, currentPath, files);
    setTasks((previous) => mergeTasks(previous, [task]));
    await refreshCurrentView();
    setNotice({ tone: "info", text: task.detail });
  }

  async function handleBatchDownload() {
    if (!selectedEntries.length) {
      setNotice({ tone: "error", text: "请先选择要下载的项目" });
      return;
    }
    const selectionMountId = requireSingleMountSelection();
    if (!selectionMountId) {
      return;
    }
    const archiveName = window.prompt("ZIP 文件名", "bundle.zip") ?? "bundle.zip";
    const task = await api.batchDownload(
      selectionMountId,
      selectedEntries.map((item) => item.path),
      archiveName,
    );
    setTasks((previous) => mergeTasks(previous, [task]));
    setNotice({ tone: "info", text: "已创建下载任务" });
  }

  async function handleOpenTask(taskId: string) {
    const task = await api.task(taskId);
    setTasks((previous) => mergeTasks(previous, [task]));
    if (task.status === "success" && task.downloadUrl) {
      window.open(api.taskDownloadUrl(task.id), "_blank", "noopener,noreferrer");
    }
  }

  async function handleSaveEditor(nextContent: string) {
    if (!editor) {
      return;
    }
    const saved = await api.saveContent({
      mountId: editor.mountId,
      path: editor.path,
      content: nextContent,
      version: editor.version,
    });
    setEditor(saved);
    setPreview((previous) =>
      previous
        ? {
            ...previous,
            content: nextContent,
            modTime: Math.floor(Date.now() / 1000),
          }
        : previous,
    );
    await refreshCurrentView();
    setNotice({ tone: "info", text: "保存成功" });
  }

  function requireSingleMountSelection() {
    const mountIds = Array.from(new Set(selectedEntries.map((item) => item.mountId)));
    if (mountIds.length !== 1) {
      setNotice({ tone: "error", text: "批量操作暂不支持跨挂载点，请在同一挂载点内选择。" });
      return "";
    }
    return mountIds[0];
  }

  if (loadingSession) {
    return <div className="loading-screen">Loading workspace...</div>;
  }

  if (!user) {
    return (
      <div className="auth-shell">
        <LoginForm onLogin={handleLogin} notice={notice} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Pan Webclient</p>
          <h1>Local Disk Navigator</h1>
        </div>
        <div className="topbar-actions">
          <input
            className="search-input"
            value={searchText}
            onChange={(event) => {
              startTransition(() => setSearchText(event.target.value));
            }}
            placeholder="搜索文件名或路径"
          />
          <button className="ghost-button" onClick={() => void handleLogout()}>
            退出
          </button>
        </div>
      </header>

      <main className="workspace-grid">
        <aside className="sidebar-card">
          <div className="panel-heading">
            <span>挂载目录</span>
            <button className="tiny-button" onClick={() => void loadMountBootstrap()}>
              刷新
            </button>
          </div>
          <SidebarTree
            mounts={mounts}
            currentMountId={currentMountId}
            currentPath={currentPath}
            treeCache={treeCache}
            expandedPaths={expandedPaths}
            onSelect={(mountId, path) => {
              setCurrentMountId(mountId);
              setCurrentPath(path);
            }}
            onToggle={async (mountId, path) => {
              setExpandedPaths((previous) =>
                previous.includes(path) ? previous.filter((item) => item !== path) : [...previous, path],
              );
              if (!treeCache[`${mountId}:${path}`]) {
                await loadTree(mountId, path);
              }
            }}
          />
        </aside>

        <section className="content-card">
          <div className="panel-heading">
            <div>
              <span className="crumb">{mounts.find((item) => item.id === currentMountId)?.name ?? "No mount"}</span>
              <strong>{deferredSearch.trim() ? `搜索：${deferredSearch}` : currentPath}</strong>
            </div>
            <div className="toolbar">
              <button className="tiny-button" onClick={() => void handleCreateFolder()}>
                新建目录
              </button>
              <button className="tiny-button" onClick={() => void handleRename()}>
                重命名
              </button>
              <button className="tiny-button" onClick={() => void handleMoveCopy("move")}>
                移动
              </button>
              <button className="tiny-button" onClick={() => void handleMoveCopy("copy")}>
                复制
              </button>
              <button className="tiny-button" onClick={() => void handleDelete()}>
                删除
              </button>
              <button className="tiny-button" onClick={() => fileInputRef.current?.click()}>
                上传
              </button>
              <button className="tiny-button accent" onClick={() => void handleBatchDownload()}>
                批量下载
              </button>
              <input
                ref={fileInputRef}
                hidden
                multiple
                type="file"
                onChange={(event) => void handleUpload(event.target.files)}
              />
            </div>
          </div>
          <FileTable
            entries={visibleRows}
            selectedEntries={selectedEntries}
            onSelect={(items) => setSelectedEntries(items)}
            onOpen={(entry) => void handleOpen(entry)}
          />
          {notice ? <div className={`notice notice-${notice.tone}`}>{notice.text}</div> : null}
        </section>

        <aside className="detail-column">
          <PreviewPane preview={preview} />
          <EditorPane editor={editor} onSave={handleSaveEditor} />
          <TaskPanel tasks={tasks} onOpenTask={(id) => void handleOpenTask(id)} />
        </aside>
      </main>
    </div>
  );
}

function mergeTasks(previous: TransferTask[], next: TransferTask[]) {
  const map = new Map(previous.map((task) => [task.id, task]));
  next.forEach((task) => map.set(task.id, task));
  return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

function basename(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts.at(-1) ?? "";
}

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type {
  EditorDocument,
  FileEntry,
  FileTreeNode,
  MountRoot,
  SearchHit,
  SessionUser,
  TrashItem,
  TransferTask,
} from "../../../../packages/contracts/index";
import { LoginForm } from "../features/auth/LoginForm";
import { EditorPane } from "../features/editor/EditorPane";
import { FileTable } from "../features/files/FileTable";
import { SidebarTree } from "../features/files/SidebarTree";
import { PreviewPane } from "../features/preview/PreviewPane";
import {
  IconCopy,
  IconDesktop,
  IconDownload,
  IconFolder,
  IconLogout,
  IconMoon,
  IconMore,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSun,
  IconTrash,
  IconUpload,
  IconArrowLeft,
  IconMove,
  IconEdit,
} from "../features/shared/Icons";
import { MenuButton } from "../features/shared/MenuButton";
import { TaskPanel } from "../features/tasks/TaskPanel";
import { TrashPanel } from "../features/tasks/TrashPanel";
import { api } from "./api";

type Notice = { tone: "info" | "error"; text: string } | null;
type ThemeMode = "system" | "light" | "dark";
type InspectorMode = "preview" | "editor" | "tasks" | "trash";
type DialogBase = { error: string; submitting: boolean };
type OperationDialog =
  | ({ kind: "create-folder"; value: string } & DialogBase)
  | ({ kind: "rename"; entry: FileEntry; value: string } & DialogBase)
  | ({ kind: "move" | "copy"; entries: FileEntry[]; targetDir: string } & DialogBase)
  | ({ kind: "delete"; entries: FileEntry[] } & DialogBase)
  | ({ kind: "batch-download"; entries: FileEntry[]; value: string } & DialogBase)
  | null;

const SHOW_HIDDEN_STORAGE_KEY = "pan-webclient:show-hidden";
const THEME_STORAGE_KEY = "pan-webclient:theme-mode";
const MOBILE_MEDIA_QUERY = "(max-width: 960px)";

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
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof api.preview>> | null>(null);
  const [editor, setEditor] = useState<EditorDocument | null>(null);
  const [tasks, setTasks] = useState<TransferTask[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText);
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [showHidden, setShowHidden] = useState(() => readStoredShowHidden());
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode());
  const [prefersDark, setPrefersDark] = useState(false);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>("preview");
  const [taskPanelCollapsed, setTaskPanelCollapsed] = useState(true);
  const [dialog, setDialog] = useState<OperationDialog>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inspectRequestRef = useRef(0);
  const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);

  const resolvedTheme = themeMode === "system" ? (prefersDark ? "dark" : "light") : themeMode;
  const searchQuery = deferredSearch.trim();
  const currentMount = useMemo(
    () => mounts.find((item) => item.id === currentMountId) ?? null,
    [currentMountId, mounts],
  );
  const activeEntry = selectedEntries.length === 1 ? selectedEntries[0] : null;
  const selectionMountIds = useMemo(
    () => Array.from(new Set(selectedEntries.map((item) => item.mountId))),
    [selectedEntries],
  );
  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentMount, currentPath), [currentMount, currentPath]);
  const directoryCount = useMemo(() => entries.filter((item) => item.isDir).length, [entries]);
  const fileCount = useMemo(() => entries.filter((item) => !item.isDir).length, [entries]);
  const hasActiveTask = useMemo(
    () => tasks.some((task) => task.status === "pending" || task.status === "running"),
    [tasks],
  );
  const canEditActiveEntry = Boolean(editor && activeEntry && !activeEntry.isDir);

  const visibleRows = useMemo(() => {
    if (!searchQuery) {
      return sortEntries(entries);
    }

    return sortEntries(
      searchResults.map((hit) => ({
        mountId: hit.mountId,
        path: hit.path,
        name: hit.name,
        isDir: hit.isDir,
        size: hit.size,
        modTime: hit.modTime,
        mime: hit.mime,
        extension: extensionFromPath(hit.path),
      })),
    );
  }, [entries, searchQuery, searchResults]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setPrefersDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SHOW_HIDDEN_STORAGE_KEY, showHidden ? "1" : "0");
  }, [showHidden]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    setTreeCache({});
    setExpandedPaths(["/"]);
  }, [showHidden]);

  useEffect(() => {
    setSelectedEntries([]);
    clearInspector(inspectRequestRef, setPreview, setEditor);
    setInspectorMode("preview");
  }, [searchQuery]);

  useEffect(() => {
    if (!showHidden) {
      setSelectedEntries((previous) => previous.filter((item) => !hasHiddenPath(item.path)));
      if ((preview && hasHiddenPath(preview.path)) || (editor && hasHiddenPath(editor.path))) {
        clearInspector(inspectRequestRef, setPreview, setEditor);
      }
    }

    if (showHidden || !hasHiddenPath(currentPath)) {
      return;
    }

    setCurrentPath("/");
    setSelectedEntries([]);
    clearInspector(inspectRequestRef, setPreview, setEditor);
    setInspectorMode("preview");
    setMobileNavOpen(false);
    setMobileInspectorOpen(false);
  }, [currentPath, editor, preview, showHidden]);

  useEffect(() => {
    if (!isMobile) {
      setMobileNavOpen(false);
      setMobileInspectorOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!user || !currentMountId) {
      return;
    }

    void loadFiles(currentMountId, currentPath, searchQuery, setEntries, setSelectedEntries, showHidden);
    void loadTree(currentMountId, "/", showHidden, setTreeCache);
    if (currentPath !== "/") {
      void loadTree(currentMountId, currentPath, showHidden, setTreeCache);
    }
  }, [currentMountId, currentPath, searchQuery, showHidden, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const handle = window.setTimeout(() => {
      void api
        .search(searchQuery, showHidden)
        .then(setSearchResults)
        .catch((error: Error) => setNotice({ tone: "error", text: error.message }));
    }, 180);

    return () => window.clearTimeout(handle);
  }, [searchQuery, showHidden, user]);

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
        .then((next) => setTasks((previous) => mergeTasks(previous, next)))
        .catch((error: Error) => setNotice({ tone: "error", text: error.message }));
    }, 1500);

    return () => window.clearInterval(handle);
  }, [tasks]);

  useEffect(() => {
    if (hasActiveTask) {
      setTaskPanelCollapsed(false);
    }
  }, [hasActiveTask]);

  useEffect(() => {
    if (inspectorMode === "editor" && !canEditActiveEntry) {
      setInspectorMode("preview");
    }
  }, [canEditActiveEntry, inspectorMode]);

  useEffect(() => {
    if (!dialog) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !dialog.submitting) {
        setDialog(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dialog]);

  async function bootstrap() {
    try {
      const me = await api.sessionMe();
      setUser(me);
      await Promise.all([loadMountBootstrap(), loadRuntimeData()]);
    } catch {
      setUser(null);
    } finally {
      setLoadingSession(false);
    }
  }

  async function loadMountBootstrap() {
    const list = await api.mounts();
    setMounts(list);
    setCurrentMountId((existing) => {
      if (existing && list.some((item) => item.id === existing)) {
        return existing;
      }
      return list[0]?.id ?? "";
    });
    setCurrentPath("/");
  }

  async function loadRuntimeData() {
    const [taskList, trashList] = await Promise.all([api.tasks(), api.trash()]);
    setTasks(taskList);
    setTrashItems(trashList);
  }

  async function reloadTrash() {
    const list = await api.trash();
    setTrashItems(list);
  }

  async function reloadSearchResults() {
    if (!searchQuery) {
      return;
    }
    const results = await api.search(searchQuery, showHidden);
    setSearchResults(results);
  }

  async function handleLogin(username: string, password: string) {
    const me = await api.login(username, password);
    setUser(me);
    setNotice({ tone: "info", text: "登录成功" });
    await Promise.all([loadMountBootstrap(), loadRuntimeData()]);
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setMounts([]);
    setCurrentMountId("");
    setCurrentPath("/");
    setEntries([]);
    setSelectedEntries([]);
    setTreeCache({});
    clearInspector(inspectRequestRef, setPreview, setEditor);
    setTasks([]);
    setTrashItems([]);
    setSearchResults([]);
    setSearchText("");
    setDialog(null);
    setInspectorMode("preview");
    setMobileNavOpen(false);
    setMobileInspectorOpen(false);
  }

  async function inspectEntry(entry: FileEntry, revealOnMobile: boolean) {
    const requestId = ++inspectRequestRef.current;

    if (entry.isDir) {
      setPreview(null);
      setEditor(null);
      setInspectorMode("preview");
      if (revealOnMobile && isMobile) {
        setMobileInspectorOpen(true);
      }
      return;
    }

    try {
      const nextPreview = await api.preview(entry.mountId, entry.path);
      if (requestId !== inspectRequestRef.current) {
        return;
      }

      setPreview(nextPreview);

      if (nextPreview.kind === "text" || nextPreview.kind === "markdown") {
        const document = await api.getContent(entry.mountId, entry.path);
        if (requestId !== inspectRequestRef.current) {
          return;
        }
        setEditor(document);
      } else {
        setEditor(null);
      }

      setInspectorMode("preview");

      if (revealOnMobile && isMobile) {
        setMobileInspectorOpen(true);
      }
    } catch (error) {
      if (requestId !== inspectRequestRef.current) {
        return;
      }
      clearInspector(inspectRequestRef, setPreview, setEditor);
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "加载预览失败" });
    }
  }

  function commitSelection(next: FileEntry[], revealOnMobile = false) {
    setSelectedEntries(next);

    if (next.length !== 1) {
      clearInspector(inspectRequestRef, setPreview, setEditor);
      setInspectorMode("preview");
      return;
    }

    void inspectEntry(next[0], revealOnMobile);
  }

  function handleToggleSelection(entry: FileEntry) {
    const exists = selectedEntries.some((item) => sameEntry(item, entry));
    const next = exists
      ? selectedEntries.filter((item) => !sameEntry(item, entry))
      : [...selectedEntries, entry];

    commitSelection(next, false);
  }

  function handleActivateEntry(entry: FileEntry) {
    if (entry.isDir) {
      clearInspector(inspectRequestRef, setPreview, setEditor);
      setSelectedEntries([]);
      setInspectorMode("preview");
      if (searchQuery) {
        startTransition(() => setSearchText(""));
        setSearchResults([]);
      }
      setCurrentMountId(entry.mountId);
      setCurrentPath(entry.path);
      setMobileNavOpen(false);
      return;
    }

    if (!activeEntry || !sameEntry(activeEntry, entry) || inspectorMode !== "preview") {
      commitSelection([entry], true);
    } else if (isMobile) {
      setMobileInspectorOpen(true);
    }
  }

  async function refreshCurrentView() {
    if (!currentMountId) {
      return;
    }

    const treeLoads = [loadTree(currentMountId, "/", showHidden, setTreeCache)];
    if (currentPath !== "/") {
      treeLoads.push(loadTree(currentMountId, currentPath, showHidden, setTreeCache));
    }

    await Promise.all([
      loadFiles(currentMountId, currentPath, searchQuery, setEntries, setSelectedEntries, showHidden),
      ...treeLoads,
      reloadSearchResults(),
      loadRuntimeData(),
    ]);
  }

  function openCreateFolderDialog() {
    setDialog({ kind: "create-folder", value: "", error: "", submitting: false });
  }

  function openRenameDialog(entry = selectedEntries[0]) {
    if (!entry) {
      setNotice({ tone: "error", text: "请选择一个项目重命名。" });
      return;
    }
    setDialog({
      kind: "rename",
      entry,
      value: basename(entry.path),
      error: "",
      submitting: false,
    });
  }

  function openMoveCopyDialog(kind: "move" | "copy", entriesArg = selectedEntries) {
    if (!entriesArg.length) {
      setNotice({ tone: "error", text: "请先选择文件或目录。" });
      return;
    }

    const mountId = getSingleMountId(entriesArg);
    if (!mountId) {
      setNotice({ tone: "error", text: "批量操作暂不支持跨挂载点选择。" });
      return;
    }

    setDialog({
      kind,
      entries: entriesArg,
      targetDir: defaultTargetDir(entriesArg, currentMountId, currentPath),
      error: "",
      submitting: false,
    });
  }

  function openDeleteDialog(entriesArg = selectedEntries) {
    if (!entriesArg.length) {
      setNotice({ tone: "error", text: "请先选择要删除的项目。" });
      return;
    }
    if (!getSingleMountId(entriesArg)) {
      setNotice({ tone: "error", text: "删除操作暂不支持跨挂载点选择。" });
      return;
    }
    setDialog({
      kind: "delete",
      entries: entriesArg,
      error: "",
      submitting: false,
    });
  }

  function openBatchDownloadDialog(entriesArg = selectedEntries) {
    if (!entriesArg.length) {
      setNotice({ tone: "error", text: "请先选择要下载的项目。" });
      return;
    }
    if (!getSingleMountId(entriesArg)) {
      setNotice({ tone: "error", text: "批量下载暂不支持跨挂载点选择。" });
      return;
    }
    setDialog({
      kind: "batch-download",
      entries: entriesArg,
      value: "bundle.zip",
      error: "",
      submitting: false,
    });
  }

  function openTasksPanel() {
    setInspectorMode("tasks");
    if (isMobile) {
      setMobileInspectorOpen(true);
    }
  }

  function openTrashPanel() {
    setInspectorMode("trash");
    if (isMobile) {
      setMobileInspectorOpen(true);
    }
  }

  async function submitDialog() {
    if (!dialog) {
      return;
    }

    setDialog((current) => (current ? { ...current, submitting: true, error: "" } : current));

    try {
      if (dialog.kind === "create-folder") {
        const name = dialog.value.trim();
        if (!name) {
          throw new Error("请输入目录名称。");
        }
        if (!currentMountId) {
          throw new Error("当前没有可用挂载点。");
        }

        await api.createFolder(currentMountId, currentPath, name);
        setDialog(null);
        await refreshCurrentView();
        setNotice({ tone: "info", text: `已创建 ${name}` });
        return;
      }

      if (dialog.kind === "rename") {
        const nextName = dialog.value.trim();
        if (!nextName) {
          throw new Error("请输入新的名称。");
        }

        await api.rename(dialog.entry.mountId, dialog.entry.path, nextName);
        setDialog(null);
        setSelectedEntries([]);
        clearInspector(inspectRequestRef, setPreview, setEditor);
        await refreshCurrentView();
        setNotice({ tone: "info", text: "重命名成功" });
        return;
      }

      if (dialog.kind === "move" || dialog.kind === "copy") {
        const mountId = getSingleMountId(dialog.entries);
        if (!mountId) {
          throw new Error("批量操作暂不支持跨挂载点选择。");
        }

        const targetDir = normalizeDirectory(dialog.targetDir);
        if (!targetDir) {
          throw new Error("请输入目标目录。");
        }

        await Promise.all(
          dialog.entries.map((entry) =>
            dialog.kind === "move"
              ? api.move(mountId, entry.path, targetDir)
              : api.copy(mountId, entry.path, targetDir),
          ),
        );

        setDialog(null);
        setSelectedEntries([]);
        clearInspector(inspectRequestRef, setPreview, setEditor);
        await refreshCurrentView();
        setNotice({ tone: "info", text: dialog.kind === "move" ? "移动完成" : "复制完成" });
        return;
      }

      if (dialog.kind === "delete") {
        const mountId = getSingleMountId(dialog.entries);
        if (!mountId) {
          throw new Error("删除操作暂不支持跨挂载点选择。");
        }

        await Promise.all(dialog.entries.map((entry) => api.remove(mountId, entry.path)));
        setDialog(null);
        setSelectedEntries([]);
        clearInspector(inspectRequestRef, setPreview, setEditor);
        await refreshCurrentView();
        setNotice({ tone: "info", text: "已移入垃圾桶" });
        return;
      }

      if (dialog.kind === "batch-download") {
        const mountId = getSingleMountId(dialog.entries);
        if (!mountId) {
          throw new Error("批量下载暂不支持跨挂载点选择。");
        }

        const archiveName = dialog.value.trim() || "bundle.zip";
        const task = await api.batchDownload(
          mountId,
          dialog.entries.map((entry) => entry.path),
          archiveName,
        );

        setTasks((previous) => mergeTasks(previous, [task]));
        setTaskPanelCollapsed(false);
        setDialog(null);
        setNotice({ tone: "info", text: "已创建下载任务" });
        openTasksPanel();
      }
    } catch (error) {
      setDialog((current) =>
        current
          ? {
              ...current,
              submitting: false,
              error: error instanceof Error ? error.message : "操作失败",
            }
          : current,
      );
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || !currentMountId) {
      return;
    }

    const task = await api.upload(currentMountId, currentPath, files);
    setTasks((previous) => mergeTasks(previous, [task]));
    setTaskPanelCollapsed(false);
    await refreshCurrentView();
    setNotice({ tone: "info", text: task.detail });
    openTasksPanel();
  }

  async function handleOpenTask(taskId: string) {
    const task = await api.task(taskId);
    setTasks((previous) => mergeTasks(previous, [task]));
    setInspectorMode("tasks");
    if (task.status === "success" && task.downloadUrl) {
      window.open(api.taskDownloadUrl(task.id), "_blank", "noopener,noreferrer");
    }
    if (isMobile) {
      setMobileInspectorOpen(true);
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

  async function handleRestoreTrash(id: string) {
    const result = await api.restoreTrash([id]);
    await reloadTrash();
    setNotice({
      tone: result.conflicts.length ? "error" : "info",
      text: result.conflicts.length ? `恢复失败：${result.conflicts.join("、")}` : "已恢复到原位置",
    });
  }

  async function handleDeleteTrash(id: string) {
    const result = await api.deleteTrash([id]);
    await reloadTrash();
    setNotice({
      tone: result.missing.length ? "error" : "info",
      text: result.missing.length ? `删除失败：${result.missing.join("、")}` : "已彻底删除",
    });
  }

  if (loadingSession) {
    return <div className="loading-screen">正在连接你的工作区...</div>;
  }

  if (!user) {
    return (
      <div className="auth-shell">
        <LoginForm
          notice={notice}
          onLogin={handleLogin}
          onThemeModeChange={setThemeMode}
          resolvedTheme={resolvedTheme}
          themeMode={themeMode}
        />
      </div>
    );
  }

  const inspectorPane = renderInspectorPane({
    activeEntry,
    canEditActiveEntry,
    currentMount,
    currentPath,
    editor,
    handleOpenTask,
    handleRestoreTrash,
    handleDeleteTrash,
    inspectorMode,
    onBack: () => setInspectorMode("preview"),
    onEnterEdit: () => setInspectorMode("editor"),
    onRefreshTrash: () => void reloadTrash(),
    onSaveEditor: handleSaveEditor,
    onShowTasks: openTasksPanel,
    preview,
    searchQuery,
    selectedEntries,
    setTaskPanelCollapsed,
    taskPanelCollapsed,
    tasks,
    trashItems,
  });

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="topbar-primary">
          {isMobile ? (
            <button className="icon-button" onClick={() => setMobileNavOpen(true)} type="button">
              <IconFolder />
            </button>
          ) : null}
          <div className="toolbar-context">
            <strong>{currentMount?.name ?? "Workspace"}</strong>
            <span>{searchQuery ? `搜索：${searchQuery}` : currentPath}</span>
          </div>
        </div>

        <div className="topbar-actions">
          <label className="search-shell">
            <IconSearch size={16} />
            <input
              className="search-input naked-input"
              onChange={(event) => {
                startTransition(() => setSearchText(event.target.value));
              }}
              placeholder="搜索文件名、路径、目录"
              value={searchText}
            />
          </label>

          <button className="icon-button primary-action" onClick={() => fileInputRef.current?.click()} type="button">
            <IconUpload />
          </button>
          <button className="icon-button" onClick={openCreateFolderDialog} type="button">
            <IconPlus />
          </button>
          {isMobile ? (
            <button className="icon-button" onClick={() => setMobileInspectorOpen(true)} type="button">
              {inspectorMode === "trash" ? <IconTrash /> : <IconArrowLeft style={{ transform: "rotate(180deg)" }} />}
            </button>
          ) : null}
          <MenuButton
            actions={[
              { label: "刷新", icon: <IconRefresh size={14} />, onSelect: () => void refreshCurrentView() },
              {
                label: showHidden ? "隐藏隐藏项" : "显示隐藏项",
                icon: <IconFolder size={14} />,
                onSelect: () => setShowHidden((previous) => !previous),
              },
              { label: "任务", icon: <IconUpload size={14} />, onSelect: openTasksPanel },
              { label: "垃圾桶", icon: <IconTrash size={14} />, onSelect: openTrashPanel },
              { label: "跟随系统", icon: <IconDesktop size={14} />, onSelect: () => setThemeMode("system") },
              { label: "浅色", icon: <IconSun size={14} />, onSelect: () => setThemeMode("light") },
              { label: "深色", icon: <IconMoon size={14} />, onSelect: () => setThemeMode("dark") },
              { label: "退出", icon: <IconLogout size={14} />, danger: true, onSelect: () => void handleLogout() },
            ]}
            align="right"
            buttonClassName="icon-button"
            buttonContent={<IconMore />}
            buttonLabel="更多操作"
          />
          <input
            ref={fileInputRef}
            hidden
            multiple
            type="file"
            onChange={(event) => void handleUpload(event.target.files)}
          />
        </div>
      </header>

      <main className="workspace-grid">
        <aside className={`sidebar-panel ${isMobile ? "mobile-sheet mobile-nav-sheet" : ""} ${mobileNavOpen ? "is-open" : ""}`}>
          <div className="panel-heading">
            <div>
              <span>目录树</span>
              <strong>{currentMount?.path ?? "No mount selected"}</strong>
            </div>
            <div className="toolbar">
              <button className="icon-button" onClick={() => void loadMountBootstrap()} type="button">
                <IconRefresh />
              </button>
              {isMobile ? (
                <button className="icon-button" onClick={() => setMobileNavOpen(false)} type="button">
                  <IconArrowLeft />
                </button>
              ) : null}
            </div>
          </div>

          <SidebarTree
            currentMountId={currentMountId}
            currentPath={currentPath}
            expandedPaths={expandedPaths}
            mounts={mounts}
            onSelect={(mountId, path) => {
              clearInspector(inspectRequestRef, setPreview, setEditor);
              setSelectedEntries([]);
              setInspectorMode("preview");
              setCurrentMountId(mountId);
              setCurrentPath(path);
              setMobileNavOpen(false);
            }}
            onToggle={async (mountId, path) => {
              setExpandedPaths((previous) =>
                previous.includes(path) ? previous.filter((item) => item !== path) : [...previous, path],
              );
              if (!treeCache[treeCacheKey(mountId, path, showHidden)]) {
                await loadTree(mountId, path, showHidden, setTreeCache);
              }
            }}
            treeCache={treeCache}
            treeCacheKeySuffix={showHidden ? "1" : "0"}
          />
        </aside>

        <section className="content-panel">
          <div className="content-head">
            {searchQuery ? (
              <div className="search-context compact-callout">
                <span className="eyebrow">Search</span>
                <strong>{visibleRows.length} 条结果</strong>
                <small>当前搜索 “{searchQuery}”</small>
              </div>
            ) : (
              <nav aria-label="Breadcrumb" className="breadcrumb-trail">
                {breadcrumbs.map((crumb, index) => (
                  <button
                    className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? "is-active" : ""}`}
                    key={crumb.path}
                    onClick={() => {
                      clearInspector(inspectRequestRef, setPreview, setEditor);
                      setSelectedEntries([]);
                      setInspectorMode("preview");
                      setCurrentPath(crumb.path);
                    }}
                    type="button"
                  >
                    {crumb.label}
                  </button>
                ))}
              </nav>
            )}

            {selectedEntries.length > 0 ? (
              <div className="selection-toolbar">
                <span>{selectedEntries.length} 项已选</span>
                <button className="icon-button" disabled={selectedEntries.length !== 1} onClick={() => openRenameDialog()} type="button">
                  <IconEdit />
                </button>
                <button className="icon-button" onClick={() => openMoveCopyDialog("move")} type="button">
                  <IconMove />
                </button>
                <button className="icon-button" onClick={() => openMoveCopyDialog("copy")} type="button">
                  <IconCopy />
                </button>
                <button className="icon-button" onClick={() => openBatchDownloadDialog()} type="button">
                  <IconDownload />
                </button>
                <button className="icon-button danger-text" onClick={() => openDeleteDialog()} type="button">
                  <IconTrash />
                </button>
              </div>
            ) : null}
          </div>

          <FileTable
            entries={visibleRows}
            onActivate={handleActivateEntry}
            onCopy={(entry) => openMoveCopyDialog("copy", [entry])}
            onDelete={(entry) => openDeleteDialog([entry])}
            onDownload={(entry) => openBatchDownloadDialog([entry])}
            onMove={(entry) => openMoveCopyDialog("move", [entry])}
            onRename={(entry) => openRenameDialog(entry)}
            onToggleSelection={handleToggleSelection}
            selectedEntries={selectedEntries}
            showPath={Boolean(searchQuery)}
          />

          {notice ? <div className={`notice notice-${notice.tone}`}>{notice.text}</div> : null}
        </section>

        {!isMobile ? <aside className="inspector-column">{inspectorPane}</aside> : null}
      </main>

      {isMobile ? (
        <aside className={`inspector-column mobile-sheet mobile-inspector-sheet ${mobileInspectorOpen ? "is-open" : ""}`}>
          <div className="mobile-detail-head">
            <div>
              <span>{inspectorMode === "trash" ? "垃圾桶" : inspectorMode === "tasks" ? "任务" : "工作区"}</span>
              <small>{inspectorMode === "editor" ? "编辑" : inspectorMode === "preview" ? "预览" : "列表"}</small>
            </div>
            <button className="icon-button" onClick={() => setMobileInspectorOpen(false)} type="button">
              <IconArrowLeft />
            </button>
          </div>
          {inspectorPane}
        </aside>
      ) : null}

      <footer className="status-bar">
        <span>{searchQuery ? `搜索 “${searchQuery}”` : `当前位置 ${currentPath}`}</span>
        <span>目录 {directoryCount} · 文件 {fileCount}</span>
        <span>选中 {selectedEntries.length}</span>
        <span>任务 {tasks.length}</span>
      </footer>

      {dialog ? (
        <OperationDialogView
          dialog={dialog}
          isMobile={isMobile}
          onChange={(value) => {
            setDialog((current) => {
              if (!current) {
                return current;
              }

              if (current.kind === "create-folder" || current.kind === "rename" || current.kind === "batch-download") {
                return { ...current, value, error: "" };
              }

              if (current.kind === "move" || current.kind === "copy") {
                return { ...current, targetDir: value, error: "" };
              }

              return current;
            });
          }}
          onClose={() => {
            if (!dialog.submitting) {
              setDialog(null);
            }
          }}
          onSubmit={() => void submitDialog()}
        />
      ) : null}
    </div>
  );
}

function renderInspectorPane(props: {
  activeEntry: FileEntry | null;
  canEditActiveEntry: boolean;
  currentMount: MountRoot | null;
  currentPath: string;
  editor: EditorDocument | null;
  handleDeleteTrash: (id: string) => void;
  handleOpenTask: (taskId: string) => Promise<void>;
  handleRestoreTrash: (id: string) => void;
  inspectorMode: InspectorMode;
  onBack: () => void;
  onEnterEdit: () => void;
  onRefreshTrash: () => void;
  onSaveEditor: (nextContent: string) => Promise<void>;
  onShowTasks: () => void;
  preview: Awaited<ReturnType<typeof api.preview>> | null;
  searchQuery: string;
  selectedEntries: FileEntry[];
  setTaskPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  taskPanelCollapsed: boolean;
  tasks: TransferTask[];
  trashItems: TrashItem[];
}) {
  if (props.inspectorMode === "editor") {
    return (
      <EditorPane
        activeEntry={props.activeEntry}
        editor={props.editor}
        onBack={props.onBack}
        onSave={props.onSaveEditor}
        selectionCount={props.selectedEntries.length}
      />
    );
  }

  if (props.inspectorMode === "tasks") {
    return (
      <TaskPanel
        collapsed={props.taskPanelCollapsed}
        onBack={props.onBack}
        onOpenTask={(id) => void props.handleOpenTask(id)}
        onToggle={() => props.setTaskPanelCollapsed((previous) => !previous)}
        tasks={props.tasks}
      />
    );
  }

  if (props.inspectorMode === "trash") {
    return (
      <TrashPanel
        items={props.trashItems}
        onBack={props.onBack}
        onDelete={props.handleDeleteTrash}
        onRefresh={props.onRefreshTrash}
        onRestore={props.handleRestoreTrash}
      />
    );
  }

  return (
    <PreviewPane
      activeEntry={props.activeEntry}
      canEdit={props.canEditActiveEntry}
      currentMount={props.currentMount}
      currentPath={props.currentPath}
      onEnterEdit={props.onEnterEdit}
      onShowTasks={props.onShowTasks}
      preview={props.preview}
      searchQuery={props.searchQuery}
      selectedEntries={props.selectedEntries}
      taskCount={props.tasks.length}
    />
  );
}

function OperationDialogView(props: {
  dialog: NonNullable<OperationDialog>;
  isMobile: boolean;
  onClose: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const value =
    props.dialog.kind === "create-folder" || props.dialog.kind === "rename" || props.dialog.kind === "batch-download"
      ? props.dialog.value
      : props.dialog.kind === "move" || props.dialog.kind === "copy"
        ? props.dialog.targetDir
        : "";

  const requiresInput = props.dialog.kind !== "delete";
  const selectedItems =
    props.dialog.kind === "create-folder" || props.dialog.kind === "rename" ? [] : props.dialog.entries;

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!props.dialog.submitting) {
          props.onClose();
        }
      }}
      role="presentation"
    >
      <form
        className={`app-modal ${props.isMobile ? "is-mobile" : ""} ${props.dialog.kind === "delete" ? "is-danger" : ""}`}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">{dialogEyebrow(props.dialog.kind)}</p>
            <h2>{dialogTitle(props.dialog)}</h2>
            <p className="muted">{dialogDescription(props.dialog)}</p>
          </div>
          <button className="modal-close" disabled={props.dialog.submitting} onClick={props.onClose} type="button">
            x
          </button>
        </div>

        {requiresInput ? (
          <label className="field modal-field">
            <span>{dialogFieldLabel(props.dialog.kind)}</span>
            <input autoFocus onChange={(event) => props.onChange(event.target.value)} value={value} />
          </label>
        ) : null}

        {selectedItems.length > 0 ? (
          <div className="modal-selection">
            <span className="status-label">涉及项目</span>
            <div className="selection-list">
              {selectedItems.slice(0, 6).map((entry) => (
                <span className="selection-pill" key={`${entry.mountId}:${entry.path}`}>
                  {entry.name}
                </span>
              ))}
              {selectedItems.length > 6 ? (
                <span className="selection-pill muted">+{selectedItems.length - 6}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {props.dialog.error ? <div className="notice notice-error">{props.dialog.error}</div> : null}

        <div className="modal-actions">
          <button className="ghost-button compact-button" disabled={props.dialog.submitting} onClick={props.onClose} type="button">
            取消
          </button>
          <button
            className={`primary-button compact-button ${props.dialog.kind === "delete" ? "danger-button" : ""}`}
            disabled={props.dialog.submitting}
            type="submit"
          >
            {props.dialog.submitting ? "处理中..." : dialogConfirmLabel(props.dialog.kind)}
          </button>
        </div>
      </form>
    </div>
  );
}

function dialogEyebrow(kind: NonNullable<OperationDialog>["kind"]) {
  if (kind === "delete") {
    return "Danger Zone";
  }
  if (kind === "batch-download") {
    return "Archive";
  }
  return "Operation";
}

function dialogTitle(dialog: NonNullable<OperationDialog>) {
  switch (dialog.kind) {
    case "create-folder":
      return "新建目录";
    case "rename":
      return `重命名 ${dialog.entry.name}`;
    case "move":
      return `移动 ${dialog.entries.length} 个项目`;
    case "copy":
      return `复制 ${dialog.entries.length} 个项目`;
    case "delete":
      return `删除 ${dialog.entries.length} 个项目`;
    case "batch-download":
      return `批量下载 ${dialog.entries.length} 个项目`;
  }
}

function dialogDescription(dialog: NonNullable<OperationDialog>) {
  switch (dialog.kind) {
    case "create-folder":
      return "目录会创建在当前工作目录下。";
    case "rename":
      return "仅修改名称，不改变所在目录。";
    case "move":
      return "输入目标目录路径，所有选中项目都会移动过去。";
    case "copy":
      return "输入目标目录路径，所有选中项目都会复制过去。";
    case "delete":
      return "删除会进入垃圾桶，不会直接执行不可恢复删除。";
    case "batch-download":
      return "系统会在后台创建压缩包任务，成功后可在任务区下载。";
  }
}

function dialogFieldLabel(kind: NonNullable<OperationDialog>["kind"]) {
  switch (kind) {
    case "create-folder":
      return "目录名称";
    case "rename":
      return "新名称";
    case "move":
    case "copy":
      return "目标目录";
    case "batch-download":
      return "ZIP 文件名";
    case "delete":
      return "";
  }
}

function dialogConfirmLabel(kind: NonNullable<OperationDialog>["kind"]) {
  switch (kind) {
    case "create-folder":
      return "创建";
    case "rename":
      return "保存名称";
    case "move":
      return "确认移动";
    case "copy":
      return "确认复制";
    case "delete":
      return "确认删除";
    case "batch-download":
      return "创建任务";
  }
}

async function loadFiles(
  mountId: string,
  path: string,
  searchQuery: string,
  setEntries: (value: FileEntry[]) => void,
  setSelectedEntries: React.Dispatch<React.SetStateAction<FileEntry[]>>,
  showHidden: boolean,
) {
  const rows = await api.files(mountId, path, showHidden);
  setEntries(rows);

  if (!searchQuery) {
    setSelectedEntries((previous) =>
      previous
        .map((item) => rows.find((row) => sameEntry(row, item)) ?? null)
        .filter((item): item is FileEntry => item !== null),
    );
  }
}

async function loadTree(
  mountId: string,
  path: string,
  showHidden: boolean,
  setTreeCache: React.Dispatch<React.SetStateAction<Record<string, FileTreeNode[]>>>,
) {
  const nodes = await api.tree(mountId, path, showHidden);
  setTreeCache((previous) => ({ ...previous, [treeCacheKey(mountId, path, showHidden)]: nodes }));
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

function dirname(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return "/";
  }
  return `/${parts.slice(0, -1).join("/")}`;
}

function treeCacheKey(mountId: string, path: string, showHidden: boolean) {
  return `${mountId}:${showHidden ? "1" : "0"}:${path}`;
}

function extensionFromPath(path: string) {
  const name = basename(path);
  const index = name.lastIndexOf(".");
  if (index <= 0) {
    return "";
  }
  return name.slice(index).toLowerCase();
}

function hasHiddenPath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .some((part) => part.startsWith("."));
}

function readStoredShowHidden() {
  const raw = window.localStorage.getItem(SHOW_HIDDEN_STORAGE_KEY);
  return raw === "1";
}

function readStoredThemeMode(): ThemeMode {
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") {
    return raw;
  }
  return "system";
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

function clearInspector(
  inspectRequestRef: React.MutableRefObject<number>,
  setPreview: React.Dispatch<React.SetStateAction<Awaited<ReturnType<typeof api.preview>> | null>>,
  setEditor: React.Dispatch<React.SetStateAction<EditorDocument | null>>,
) {
  inspectRequestRef.current += 1;
  setPreview(null);
  setEditor(null);
}

function sameEntry(left: Pick<FileEntry, "mountId" | "path">, right: Pick<FileEntry, "mountId" | "path">) {
  return left.mountId === right.mountId && left.path === right.path;
}

function getSingleMountId(entries: FileEntry[]) {
  const ids = Array.from(new Set(entries.map((entry) => entry.mountId)));
  return ids.length === 1 ? ids[0] : "";
}

function normalizeDirectory(path: string) {
  const trimmed = path.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed === "/") {
    return "/";
  }
  const normalized = trimmed.replace(/\/+$/, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function defaultTargetDir(entries: FileEntry[], currentMountId: string, currentPath: string) {
  const first = entries[0];
  if (!first) {
    return currentPath;
  }
  return first.mountId === currentMountId ? currentPath : dirname(first.path);
}

function buildBreadcrumbs(currentMount: MountRoot | null, currentPath: string) {
  const parts = currentPath.split("/").filter(Boolean);
  const crumbs = [{ label: currentMount?.name ?? "根目录", path: "/" }];
  let cursor = "";

  for (const part of parts) {
    cursor += `/${part}`;
    crumbs.push({ label: part, path: cursor });
  }

  return crumbs;
}

function sortEntries(rows: FileEntry[]) {
  return [...rows].sort((left, right) => {
    if (left.isDir && !right.isDir) {
      return -1;
    }
    if (!left.isDir && right.isDir) {
      return 1;
    }
    return left.name.localeCompare(right.name, "zh-CN", { numeric: true, sensitivity: "base" });
  });
}

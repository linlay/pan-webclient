import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { api, rawFileUrl } from "@/api";
import { isAppMode } from "@/api/routing";
import { uploadSizeErrorMessage } from "@/api/uploadLimits";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  basename,
  buildBreadcrumbs,
  buildLocalUploadTask,
  clearInspector,
  defaultTargetDir,
  dirname,
  entryFromPreview,
  extensionFromPath,
  getSingleMountId,
  hasHiddenPath,
  isLocalTaskId,
  loadFiles,
  loadTree,
  mergeTasks,
  normalizeDirectory,
  pathLineage,
  readStoredShowHidden,
  readStoredThemeMode,
  readStoredViewMode,
  sameEntry,
  sortEntries,
  treeCacheKey,
  useMediaQuery,
} from "@/utils";
import {
  MOBILE_MEDIA_QUERY,
  SHOW_HIDDEN_STORAGE_KEY,
  THEME_STORAGE_KEY,
  VIEW_MODE_STORAGE_KEY,
} from "@/static";
import type {
  EditorDocument,
  FileEntry,
  FileTreeNode,
  ManagedShare,
  MountRoot,
  SearchHit,
  SessionUser,
  TrashItem,
  TransferTask,
} from "@/types/contracts";
import type {
  InspectorMode,
  Notice,
  OperationDialog,
  ThemeMode,
  ViewMode,
} from "@/types/home";

type TaskDeleteDialogState = {
  task: TransferTask;
  submitting: boolean;
  error: string;
};

export function useAppController() {
  const { t } = useTranslation();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [mounts, setMounts] = useState<MountRoot[]>([]);
  const [currentMountId, setCurrentMountId] = useState("");
  const [currentPath, setCurrentPath] = useState("/");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<FileEntry[]>([]);
  const [treeCache, setTreeCache] = useState<Record<string, FileTreeNode[]>>(
    {},
  );
  const [expandedPaths, setExpandedPaths] = useState<string[]>(["/"]);
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof api.preview>
  > | null>(null);
  const [editor, setEditor] = useState<EditorDocument | null>(null);
  const [tasks, setTasks] = useState<TransferTask[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [shares, setShares] = useState<ManagedShare[]>([]);
  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText);
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [showHidden, setShowHidden] = useState(() => readStoredShowHidden());
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    readStoredThemeMode(),
  );
  const [prefersDark, setPrefersDark] = useState(false);
  const [inspectorMode, setInspectorMode] =
    useState<InspectorMode>("preview");
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    readStoredViewMode(),
  );
  const [taskPanelCollapsed, setTaskPanelCollapsed] = useState(true);
  const [dialog, setDialog] = useState<OperationDialog>(null);
  const [taskDeleteDialog, setTaskDeleteDialog] =
    useState<TaskDeleteDialogState | null>(null);
  const [shareTarget, setShareTarget] = useState<FileEntry | null>(null);
  const [deletingShareId, setDeletingShareId] = useState<string | null>(null);
  const [dialogExpandedPaths, setDialogExpandedPaths] = useState<string[]>([
    "/",
  ]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [mobileSelectionMode, setMobileSelectionMode] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inspectRequestRef = useRef(0);
  const taskStatusRef = useRef<Record<string, TransferTask["status"]>>({});
  const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);

  const resolvedTheme =
    themeMode === "system" ? (prefersDark ? "dark" : "light") : themeMode;
  const searchQuery = deferredSearch.trim();
  const currentMount = useMemo(
    () => mounts.find((item) => item.id === currentMountId) ?? null,
    [currentMountId, mounts],
  );
  const singleMountMode = mounts.length <= 1;
  const activeEntry =
    selectedEntries.length === 1 ? selectedEntries[0] : null;
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(currentMount, currentPath),
    [currentMount, currentPath],
  );
  const currentDirectoryTitle = user
    ? breadcrumbs[breadcrumbs.length - 1]?.label ?? null
    : null;
  const canShareCurrentDirectory = Boolean(
    currentMountId && currentPath !== "/",
  );
  const currentDirectoryShareTarget = useMemo<FileEntry | null>(() => {
    if (!canShareCurrentDirectory) {
      return null;
    }
    return {
      mountId: currentMountId,
      path: currentPath,
      name: basename(currentPath),
      isDir: true,
      size: 0,
      modTime: Math.floor(Date.now() / 1000),
      mime: "",
      extension: "",
    };
  }, [canShareCurrentDirectory, currentMountId, currentPath]);
  const hasActiveTask = useMemo(
    () =>
      tasks.some(
        (task) =>
          task.status === "pending" || task.status === "running",
      ),
    [tasks],
  );
  const canEditActiveEntry = Boolean(
    editor && activeEntry && !activeEntry.isDir,
  );
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
  const visibleFoldersCount = useMemo(
    () => visibleRows.filter((entry) => entry.isDir).length,
    [visibleRows],
  );
  const visibleFilesCount = visibleRows.length - visibleFoldersCount;
  const hasSelection = isMobile
    ? mobileSelectionMode && selectedEntries.length > 0
    : selectedEntries.length > 0;
  const previewEntry = useMemo(
    () => (preview ? entryFromPreview(preview) : null),
    [preview],
  );
  const desktopPreviewOpen = Boolean(
    !isMobile &&
    inspectorMode === "preview" &&
    activeEntry &&
    !activeEntry.isDir &&
    preview,
  );
  const dialogMountId = useMemo(() => {
    if (!dialog || (dialog.kind !== "move" && dialog.kind !== "copy")) {
      return "";
    }
    return getSingleMountId(dialog.entries);
  }, [dialog]);
  const dialogMount = useMemo(
    () =>
      dialogMountId
        ? mounts.find((item) => item.id === dialogMountId) ?? null
        : null,
    [dialogMountId, mounts],
  );
  const mobileInspectorTitle =
    inspectorMode === "trash"
      ? t("controller.inspector.trash")
      : inspectorMode === "shares"
        ? t("controller.inspector.shares")
        : t("controller.inspector.tasks");

  useDocumentTitle(currentDirectoryTitle);

  function clearSelectionInspector() {
    setSelectedEntries([]);
    setMobileSelectionMode(false);
    clearInspector(inspectRequestRef, setPreview, setEditor);
    setInspectorMode("preview");
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setPrefersDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SHOW_HIDDEN_STORAGE_KEY,
      showHidden ? "1" : "0",
    );
  }, [showHidden]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      resolvedTheme === "dark",
    );
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
    clearSelectionInspector();
  }, [searchQuery]);

  useEffect(() => {
    if (!showHidden) {
      setSelectedEntries((prev) =>
        prev.filter((item) => !hasHiddenPath(item.path)),
      );
      if (
        (preview && hasHiddenPath(preview.path)) ||
        (editor && hasHiddenPath(editor.path))
      ) {
        clearInspector(inspectRequestRef, setPreview, setEditor);
      }
    }
    if (showHidden || !hasHiddenPath(currentPath)) return;
    setCurrentPath("/");
    clearSelectionInspector();
    setMobileNavOpen(false);
    setMobileInspectorOpen(false);
    setInspectorOpen(true);
  }, [currentPath, editor, preview, showHidden]);

  useEffect(() => {
    if (!isMobile) {
      setMobileNavOpen(false);
      setMobileInspectorOpen(false);
      setMobileSelectionMode(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (fullScreenImage) {
          setFullScreenImage(null);
        } else if (desktopPreviewOpen) {
          handleCloseDesktopPreview();
        } else if (dialog) {
          setDialog(null);
        } else if (taskDeleteDialog && !taskDeleteDialog.submitting) {
          setTaskDeleteDialog(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    fullScreenImage,
    desktopPreviewOpen,
    dialog,
    taskDeleteDialog,
  ]);

  useEffect(() => {
    if (!user || !currentMountId) return;
    void loadCurrentLocation();
  }, [currentMountId, currentPath, searchQuery, showHidden, user]);

  useEffect(() => {
    if (!user) return;
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void api
        .search(searchQuery, showHidden)
        .then(setSearchResults)
        .catch((error: Error) =>
          setNotice({ tone: "error", text: error.message }),
        );
    }, 180);
    return () => window.clearTimeout(handle);
  }, [searchQuery, showHidden, user]);

  useEffect(() => {
    if (!tasks.length) return;
    const active = tasks.filter(
      (task) =>
        !isLocalTaskId(task.id) &&
        (task.status === "pending" || task.status === "running"),
    );
    if (!active.length) return;
    const handle = window.setInterval(() => {
      void Promise.all(active.map((task) => api.task(task.id)))
        .then((next) => setTasks((prev) => mergeTasks(prev, next)))
        .catch((error: Error) =>
          setNotice({ tone: "error", text: error.message }),
        );
    }, 1000);
    return () => window.clearInterval(handle);
  }, [tasks]);

  useEffect(() => {
    if (hasActiveTask) setTaskPanelCollapsed(false);
  }, [hasActiveTask]);

  useEffect(() => {
    const nextStatusMap: Record<string, TransferTask["status"]> = {};
    for (const task of tasks) {
      const previousStatus = taskStatusRef.current[task.id];
      if (
        previousStatus &&
        previousStatus !== "success" &&
        task.status === "success" &&
        task.kind === "download" &&
        task.downloadUrl
      ) {
        triggerTaskDownload(task.id);
      }
      nextStatusMap[task.id] = task.status;
    }
    taskStatusRef.current = nextStatusMap;
  }, [tasks]);

  useEffect(() => {
    if (inspectorMode === "editor" && !canEditActiveEntry) {
      setInspectorMode("preview");
    }
  }, [canEditActiveEntry, inspectorMode]);

  useEffect(() => {
    if (!dialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !dialog.submitting) {
        setDialog(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dialog]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function bootstrap() {
    try {
      const me = await api.sessionMe();
      setUser(me);
      await Promise.all([loadMountBootstrap(), loadRuntimeData()]);
    } catch (error) {
      setUser(null);
      if (isAppMode()) {
        setNotice({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : t("controller.errors.appModeToken"),
        });
      }
    } finally {
      setLoadingSession(false);
    }
  }

  async function loadMountBootstrap() {
    const list = await api.mounts();
    setMounts(list);
    setCurrentMountId((existing) =>
      existing && list.some((item) => item.id === existing)
        ? existing
        : (list[0]?.id ?? ""),
    );
    setCurrentPath("/");
  }

  async function loadRuntimeData() {
    const [taskList, trashList, shareList] = await Promise.all([
      api.tasks(),
      api.trash(),
      api.shares(),
    ]);
    setTasks(taskList);
    setTrashItems(trashList);
    setShares(shareList);
  }

  async function loadCurrentLocation() {
    if (!currentMountId) return;
    try {
      const loads = [
        loadFiles(
          currentMountId,
          currentPath,
          searchQuery,
          setEntries,
          setSelectedEntries,
          showHidden,
        ),
      ];
      if (!treeCache[treeCacheKey(currentMountId, "/", showHidden)]) {
        loads.push(loadTree(currentMountId, "/", showHidden, setTreeCache));
      }
      if (currentPath !== "/") {
        const currentTreeKey = treeCacheKey(
          currentMountId,
          currentPath,
          showHidden,
        );
        if (!treeCache[currentTreeKey]) {
          loads.push(
            loadTree(
              currentMountId,
              currentPath,
              showHidden,
              setTreeCache,
            ),
          );
        }
      }
      await Promise.all(loads);
    } catch (error) {
      clearInspector(inspectRequestRef, setPreview, setEditor);
      setEntries([]);
      setSelectedEntries([]);
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : t("controller.errors.loadDirectoryFailed"),
      });
    }
  }

  async function reloadTrash() {
    setTrashItems(await api.trash());
  }

  async function reloadShares() {
    setShares(await api.shares());
  }

  async function reloadSearchResults() {
    if (searchQuery) {
      setSearchResults(await api.search(searchQuery, showHidden));
    }
  }

  async function handleLogin(username: string, password: string) {
    const me = await api.login(username, password);
    setUser(me);
    setNotice({ tone: "info", text: t("controller.info.loginSuccess") });
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
    setShares([]);
    setSearchResults([]);
    setSearchText("");
    setDialog(null);
    setInspectorMode("preview");
    setMobileNavOpen(false);
    setMobileInspectorOpen(false);
    setInspectorOpen(true);
    setDeletingShareId(null);
  }

  async function inspectEntry(entry: FileEntry, revealOnMobile: boolean) {
    const requestId = ++inspectRequestRef.current;
    if (entry.isDir) {
      setPreview(null);
      setEditor(null);
      setInspectorMode("preview");
      if (revealOnMobile && isMobile) setMobileInspectorOpen(true);
      return;
    }
    try {
      const nextPreview = await api.preview(entry.mountId, entry.path);
      if (requestId !== inspectRequestRef.current) return;
      setPreview(nextPreview);
      if (nextPreview.kind === "text" || nextPreview.kind === "markdown") {
        const document = await api.getContent(entry.mountId, entry.path);
        if (requestId !== inspectRequestRef.current) return;
        setEditor(document);
      } else {
        setEditor(null);
      }
      setInspectorMode("preview");
      setInspectorOpen(true);
      if (revealOnMobile && isMobile) setMobileInspectorOpen(true);
    } catch (error) {
      if (requestId !== inspectRequestRef.current) return;
      clearInspector(inspectRequestRef, setPreview, setEditor);
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : t("controller.errors.loadPreviewFailed"),
      });
    }
  }

  function commitSelection(
    next: FileEntry[],
    options: { inspectSingle?: boolean; revealOnMobile?: boolean } = {},
  ) {
    const { inspectSingle = true, revealOnMobile = false } = options;
    setSelectedEntries(next);
    if (!inspectSingle || next.length !== 1) {
      clearInspector(inspectRequestRef, setPreview, setEditor);
      setInspectorMode("preview");
      return;
    }
    void inspectEntry(next[0], revealOnMobile);
  }

  function handleSetSelection(next: FileEntry[]) {
    commitSelection(next, { inspectSingle: !isMobile });
  }

  function handleToggleSelection(entry: FileEntry) {
    const exists = selectedEntries.some((item) => sameEntry(item, entry));
    handleSetSelection(
      exists
        ? selectedEntries.filter((item) => !sameEntry(item, entry))
        : [...selectedEntries, entry],
    );
  }

  function handleActivateEntry(entry: FileEntry) {
    if (isMobile && mobileSelectionMode) {
      handleToggleSelection(entry);
      return;
    }
    if (entry.isDir) {
      clearSelectionInspector();
      if (searchQuery) {
        startTransition(() => setSearchText(""));
        setSearchResults([]);
      }
      setCurrentMountId(entry.mountId);
      setCurrentPath(entry.path);
      setMobileNavOpen(false);
      return;
    }
    if (
      !activeEntry ||
      !sameEntry(activeEntry, entry) ||
      inspectorMode !== "preview"
    ) {
      commitSelection([entry], {
        inspectSingle: true,
        revealOnMobile: true,
      });
    } else if (isMobile) {
      setMobileInspectorOpen(true);
    }
  }

  async function refreshCurrentView() {
    if (!currentMountId) return;
    const loads = [loadTree(currentMountId, "/", showHidden, setTreeCache)];
    if (currentPath !== "/") {
      loads.push(
        loadTree(currentMountId, currentPath, showHidden, setTreeCache),
      );
    }
    await Promise.all([
      loadFiles(
        currentMountId,
        currentPath,
        searchQuery,
        setEntries,
        setSelectedEntries,
        showHidden,
      ),
      ...loads,
      reloadSearchResults(),
      loadRuntimeData(),
    ]);
  }

  function openCreateFolderDialog() {
    setDialog({
      kind: "create-folder",
      value: "",
      error: "",
      submitting: false,
    });
  }

  function openRenameDialog(entry = selectedEntries[0]) {
    if (!entry) {
      setNotice({
        tone: "error",
        text: t("controller.errors.selectOneRename"),
      });
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

  function openMoveCopyDialog(
    kind: "move" | "copy",
    entriesArg = selectedEntries,
  ) {
    if (!entriesArg.length) {
      setNotice({
        tone: "error",
        text: t("controller.errors.selectEntriesFirst"),
      });
      return;
    }
    const mountId = getSingleMountId(entriesArg);
    if (!mountId) {
      setNotice({
        tone: "error",
        text: t("controller.errors.crossMountBatch"),
      });
      return;
    }
    const targetDir = defaultTargetDir(
      entriesArg,
      currentMountId,
      currentPath,
    );
    setDialogExpandedPaths(pathLineage(targetDir));
    setDialog({
      kind,
      entries: entriesArg,
      targetDir,
      error: "",
      submitting: false,
    });
    void ensureDialogTreeLoaded(mountId, targetDir);
  }

  function openDeleteDialog(entriesArg = selectedEntries) {
    if (!entriesArg.length) {
      setNotice({
        tone: "error",
        text: t("controller.errors.selectDeleteFirst"),
      });
      return;
    }
    if (!getSingleMountId(entriesArg)) {
      setNotice({
        tone: "error",
        text: t("controller.errors.crossMountDelete"),
      });
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
      setNotice({
        tone: "error",
        text: t("controller.errors.selectDownloadFirst"),
      });
      return;
    }
    if (entriesArg.length === 1 && !entriesArg[0].isDir) {
      const entry = entriesArg[0];
      const link = document.createElement("a");
      link.href = rawFileUrl(entry.mountId, entry.path);
      link.download = entry.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    if (!getSingleMountId(entriesArg)) {
      setNotice({
        tone: "error",
        text: t("controller.errors.crossMountDownload"),
      });
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

  function openShareDialog(entry = selectedEntries[0]) {
    if (!entry) {
      setNotice({
        tone: "error",
        text: t("controller.errors.selectShareFirst"),
      });
      return;
    }
    setShareTarget(entry);
  }

  function openCurrentDirectoryShareDialog() {
    if (!currentDirectoryShareTarget) {
      setNotice({
        tone: "error",
        text: t("controller.errors.shareCurrentDirUnsupported"),
      });
      return;
    }
    openShareDialog(currentDirectoryShareTarget);
  }

  function openTasksPanel() {
    setInspectorMode("tasks");
    setTaskPanelCollapsed(false);
    setInspectorOpen(true);
    if (isMobile) setMobileInspectorOpen(true);
  }

  function openSharesPanel() {
    setInspectorMode("shares");
    setInspectorOpen(true);
    if (isMobile) setMobileInspectorOpen(true);
    void reloadShares();
  }

  function openTrashPanel() {
    setInspectorMode("trash");
    setInspectorOpen(true);
    if (isMobile) setMobileInspectorOpen(true);
  }

  async function handleCopyShare(share: ManagedShare) {
    const link = new URL(share.urlPath, window.location.origin).toString();
    const copyText = share.password
      ? t("controller.copyText.linkWithPassword", {
        link,
        password: share.password,
      })
      : t("controller.copyText.linkOnly", { link });
    await navigator.clipboard.writeText(copyText);
    setNotice({
      tone: "info",
      text:
        share.access === "password"
          ? share.password
            ? t("controller.info.shareCopiedWithPassword")
            : t("controller.info.shareCopiedWithoutPassword")
          : t("controller.info.shareCopied"),
    });
  }

  async function handleDeleteShare(id: string) {
    setDeletingShareId(id);
    try {
      await api.deleteShare(id);
      await reloadShares();
      setNotice({ tone: "info", text: t("controller.info.shareRevoked") });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : t("controller.errors.operationFailed"),
      });
    } finally {
      setDeletingShareId(null);
    }
  }

  async function ensureDialogTreeLoaded(mountId: string, targetDir: string) {
    for (const path of pathLineage(targetDir)) {
      if (!treeCache[treeCacheKey(mountId, path, showHidden)]) {
        await loadTree(mountId, path, showHidden, setTreeCache);
      }
    }
  }

  async function handleDialogTreeToggle(path: string) {
    if (!dialog || (dialog.kind !== "move" && dialog.kind !== "copy")) {
      return;
    }
    const mountId = getSingleMountId(dialog.entries);
    const expanded = dialogExpandedPaths.includes(path);
    setDialogExpandedPaths((prev) =>
      expanded ? prev.filter((item) => item !== path) : [...prev, path],
    );
    if (!expanded && !treeCache[treeCacheKey(mountId, path, showHidden)]) {
      await loadTree(mountId, path, showHidden, setTreeCache);
    }
  }

  async function submitDialog() {
    if (!dialog) return;
    setDialog((current) =>
      current ? { ...current, submitting: true, error: "" } : current,
    );
    try {
      if (dialog.kind === "create-folder") {
        const name = dialog.value.trim();
        if (!name) throw new Error(t("controller.errors.enterFolderName"));
        if (!currentMountId) throw new Error(t("controller.errors.noMountAvailable"));
        await api.createFolder(currentMountId, currentPath, name);
        setDialog(null);
        await refreshCurrentView();
        setNotice({
          tone: "info",
          text: t("controller.info.folderCreated", { name }),
        });
        return;
      }
      if (dialog.kind === "rename") {
        const nextName = dialog.value.trim();
        if (!nextName) throw new Error(t("controller.errors.enterNewName"));
        await api.rename(dialog.entry.mountId, dialog.entry.path, nextName);
        setDialog(null);
        setSelectedEntries([]);
        clearInspector(inspectRequestRef, setPreview, setEditor);
        await refreshCurrentView();
        setNotice({ tone: "info", text: t("controller.info.renameSuccess") });
        return;
      }
      if (dialog.kind === "move" || dialog.kind === "copy") {
        const mountId = getSingleMountId(dialog.entries);
        if (!mountId) throw new Error(t("controller.errors.crossMountBatch"));
        const targetDir = normalizeDirectory(dialog.targetDir);
        if (!targetDir) throw new Error(t("controller.errors.enterTargetDir"));
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
        setNotice({
          tone: "info",
          text:
            dialog.kind === "move"
              ? t("controller.info.moveComplete")
              : t("controller.info.copyComplete"),
        });
        return;
      }
      if (dialog.kind === "delete") {
        const mountId = getSingleMountId(dialog.entries);
        if (!mountId) throw new Error(t("controller.errors.crossMountDelete"));
        await Promise.all(
          dialog.entries.map((entry) => api.remove(mountId, entry.path)),
        );
        setDialog(null);
        setSelectedEntries([]);
        clearInspector(inspectRequestRef, setPreview, setEditor);
        await refreshCurrentView();
        setNotice({ tone: "info", text: t("controller.info.movedToTrash") });
        return;
      }
      if (dialog.kind === "batch-download") {
        const mountId = getSingleMountId(dialog.entries);
        if (!mountId) throw new Error(t("controller.errors.crossMountDownload"));
        const archiveName = dialog.value.trim() || "bundle.zip";
        const task = await api.batchDownload(
          mountId,
          dialog.entries.map((entry) => entry.path),
          archiveName,
        );
        setTasks((prev) => mergeTasks(prev, [task]));
        setTaskPanelCollapsed(false);
        setDialog(null);
        setNotice({
          tone: "info",
          text: t("controller.info.downloadTaskCreated"),
        });
        openTasksPanel();
        setInspectorOpen(true);
      }
    } catch (error) {
      setDialog((current) =>
        current
          ? {
            ...current,
            submitting: false,
            error:
              error instanceof Error
                ? error.message
                : t("controller.errors.operationFailed"),
          }
          : current,
      );
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || !currentMountId) return;
    const uploadFiles = Array.from(files);
    const uploadError = uploadSizeErrorMessage(uploadFiles);
    if (uploadError) {
      setNotice({ tone: "error", text: uploadError });
      return;
    }
    const localTask = buildLocalUploadTask(uploadFiles);
    setTasks((prev) => mergeTasks(prev, [localTask]));
    setTaskPanelCollapsed(false);
    openTasksPanel();
    let uploadTask: TransferTask | null = null;
    try {
      const createdTask = await api.createUploadTask(uploadFiles);
      uploadTask = createdTask;
      setTasks((prev) =>
        mergeTasks(
          prev.filter((item) => item.id !== localTask.id),
          [createdTask],
        ),
      );
      const task = await api.upload(
        createdTask.id,
        currentMountId,
        currentPath,
        uploadFiles,
      );
      setTasks((prev) => mergeTasks(prev, [task]));
      await refreshCurrentView();
      setNotice({ tone: "info", text: task.detail });
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : t("controller.errors.uploadFailed");
      const fallbackFailedTask: TransferTask = {
        ...(uploadTask ?? localTask),
        status: "failed",
        detail: errorText,
        updatedAt: Math.floor(Date.now() / 1000),
      };
      setTasks((prev) =>
        mergeTasks(
          prev.filter((item) => item.id !== localTask.id),
          [fallbackFailedTask],
        ),
      );
      if (uploadTask) {
        const serverTask = await api.task(uploadTask.id).catch(() => null);
        if (serverTask && serverTask.status !== "pending" && serverTask.status !== "running") {
          setTasks((prev) => mergeTasks(prev, [serverTask]));
        } else if (serverTask?.status === "pending") {
          const cancelledTask = await api
            .cancelTask(uploadTask.id, errorText)
            .catch(() => null);
          if (cancelledTask) {
            setTasks((prev) => mergeTasks(prev, [cancelledTask]));
          }
        }
      }
      setNotice({
        tone: "error",
        text: errorText,
      });
    }
  }

  function triggerTaskDownload(taskId: string) {
    const link = document.createElement("a");
    link.href = api.taskDownloadUrl(taskId);
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleOpenTask(taskId: string) {
    if (isLocalTaskId(taskId)) {
      return;
    }
    const task = await api.task(taskId);
    setTasks((prev) => mergeTasks(prev, [task]));
    setInspectorMode("tasks");
    if (task.status === "success" && task.downloadUrl) {
      triggerTaskDownload(task.id);
    }
    if (isMobile) setMobileInspectorOpen(true);
  }

  async function handleCancelTask(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || isLocalTaskId(task.id) || task.status !== "pending") {
      return;
    }
    try {
      const cancelledTask = await api.cancelTask(taskId);
      setTasks((prev) => mergeTasks(prev, [cancelledTask]));
      setNotice({ tone: "info", text: t("controller.info.taskCancelled") });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : t("controller.errors.operationFailed"),
      });
    }
  }

  function handleDeleteTask(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === "pending" || task.status === "running") {
      return;
    }
    setTaskDeleteDialog({
      task,
      submitting: false,
      error: "",
    });
  }

  async function submitTaskDeleteDialog() {
    if (!taskDeleteDialog) {
      return;
    }
    setTaskDeleteDialog((current) =>
      current ? { ...current, submitting: true, error: "" } : current,
    );
    try {
      await api.deleteTask(taskDeleteDialog.task.id);
      setTasks((prev) =>
        prev.filter((item) => item.id !== taskDeleteDialog.task.id),
      );
      setTaskDeleteDialog(null);
      setNotice({ tone: "info", text: t("controller.info.taskDeleted") });
    } catch (error) {
      setTaskDeleteDialog((current) =>
        current
          ? {
            ...current,
            submitting: false,
            error:
              error instanceof Error
                ? error.message
                : t("controller.errors.deleteFailed"),
          }
          : current,
      );
    }
  }

  async function handleSaveEditor(nextContent: string) {
    if (!editor) return;
    const saved = await api.saveContent({
      mountId: editor.mountId,
      path: editor.path,
      content: nextContent,
      version: editor.version,
    });
    setEditor(saved);
    setPreview((prev) =>
      prev
        ? {
          ...prev,
          content: nextContent,
          modTime: Math.floor(Date.now() / 1000),
        }
        : prev,
    );
    await refreshCurrentView();
    setNotice({ tone: "info", text: t("controller.info.saveSuccess") });
  }

  async function handleRestoreTrash(id: string) {
    const result = await api.restoreTrash([id]);
    await reloadTrash();
    setNotice({
      tone: result.conflicts.length ? "error" : "info",
      text: result.conflicts.length
        ? t("controller.restoreFailed", {
          items: result.conflicts.join("、"),
        })
        : t("controller.info.restoreSuccess"),
    });
  }

  async function handleDeleteTrash(id: string) {
    const result = await api.deleteTrash([id]);
    await reloadTrash();
    setNotice({
      tone: result.missing.length ? "error" : "info",
      text: result.missing.length
        ? t("controller.deletePermanentFailed", {
          items: result.missing.join("、"),
        })
        : t("controller.info.deletePermanentSuccess"),
    });
  }

  function handleNavigateHome() {
    setCurrentPath("/");
    setMobileNavOpen(false);
  }

  function handleNavigateBreadcrumb(path: string) {
    clearSelectionInspector();
    setCurrentPath(path);
  }

  function handleNavigateUp() {
    if (currentPath !== "/") {
      setCurrentPath(dirname(currentPath));
    }
  }

  function handleSearchChange(value: string) {
    startTransition(() => setSearchText(value));
  }

  function handleToggleShowHidden() {
    setShowHidden((prev) => !prev);
  }

  function handleOpenMobileNav() {
    setMobileNavOpen(true);
  }

  function handleCloseMobileNav() {
    setMobileNavOpen(false);
  }

  function handleSelectTree(mountId: string, path: string) {
    clearSelectionInspector();
    setCurrentMountId(mountId);
    setCurrentPath(path);
    setMobileNavOpen(false);
  }

  async function handleToggleTree(mountId: string, path: string) {
    setExpandedPaths((prev) =>
      prev.includes(path)
        ? prev.filter((item) => item !== path)
        : [...prev, path],
    );
    if (!treeCache[treeCacheKey(mountId, path, showHidden)]) {
      await loadTree(mountId, path, showHidden, setTreeCache);
    }
  }

  function handleToggleAllSelection(selectAll: boolean) {
    setSelectedEntries(selectAll ? visibleRows : []);
  }

  function handleInspectorBack() {
    setInspectorMode("preview");
  }

  function handleEnterEdit() {
    setInspectorMode("editor");
  }

  function handleRefreshShares() {
    void reloadShares();
  }

  function handleRefreshTrash() {
    void reloadTrash();
  }

  function handleCloseMobileInspector() {
    setMobileInspectorOpen(false);
  }

  function handleToggleInspector() {
    setInspectorOpen((prev) => !prev);
  }

  function handleCloseFullScreenImage() {
    setFullScreenImage(null);
  }

  function handleCloseDesktopPreview() {
    clearSelectionInspector();
    setInspectorOpen(false);
  }

  function handleDialogChange(value: string) {
    setDialog((current) => {
      if (!current) return current;
      if (
        current.kind === "create-folder" ||
        current.kind === "rename" ||
        current.kind === "batch-download"
      ) {
        return { ...current, value, error: "" };
      }
      if (current.kind === "move" || current.kind === "copy") {
        return { ...current, targetDir: value, error: "" };
      }
      return current;
    });
  }

  function handleDialogClose() {
    if (!dialog?.submitting) {
      setDialog(null);
    }
  }

  function handleDialogDirectorySelect(path: string) {
    setDialogExpandedPaths(pathLineage(path));
    setDialog((current) => {
      if (!current || (current.kind !== "move" && current.kind !== "copy")) {
        return current;
      }
      return {
        ...current,
        targetDir: path,
        error: "",
      };
    });
  }

  function handleTaskDeleteDialogClose() {
    if (!taskDeleteDialog?.submitting) {
      setTaskDeleteDialog(null);
    }
  }

  function handleShareDialogClose() {
    setShareTarget(null);
  }

  function handleShareCreated() {
    void reloadShares();
  }

  const dialogDirectoryTree =
    dialog && (dialog.kind === "move" || dialog.kind === "copy")
      ? {
        mount: dialogMount,
        treeCache,
        treeCacheKeySuffix: showHidden ? "1" : "0",
        expandedPaths: dialogExpandedPaths,
        onSelect: handleDialogDirectorySelect,
        onToggle: (path: string) => void handleDialogTreeToggle(path),
      }
      : undefined;

  return {
    activeEntry,
    breadcrumbs,
    canEditActiveEntry,
    canShareCurrentDirectory,
    currentMount,
    currentMountId,
    currentPath,
    deletingShareId,
    dialog,
    dialogDirectoryTree,
    editor,
    expandedPaths,
    fileInputRef,
    fullScreenImage,
    handleActivateEntry,
    handleCloseFullScreenImage,
    handleCloseDesktopPreview,
    handleCloseMobileInspector,
    handleCloseMobileNav,
    handleCancelTask,
    handleCopyShare,
    handleDeleteShare,
    handleDeleteTask,
    handleDeleteTrash,
    handleDialogChange,
    handleDialogClose,
    handleEnterEdit,
    handleInspectorBack,
    handleLogin,
    handleLogout,
    handleNavigateBreadcrumb,
    handleNavigateHome,
    handleNavigateUp,
    handleOpenMobileNav,
    handleOpenTask,
    handleRefreshShares,
    handleRefreshTrash,
    handleRestoreTrash,
    handleSaveEditor,
    handleSearchChange,
    handleSelectTree,
    handleSetSelection,
    handleShareCreated,
    handleShareDialogClose,
    handleTaskDeleteDialogClose,
    handleToggleAllSelection,
    handleToggleInspector,
    handleToggleSelection,
    handleToggleShowHidden,
    handleToggleTree,
    handleUpload,
    hasSelection,
    inspectorMode,
    inspectorOpen,
    isMobile,
    loadingSession,
    mobileInspectorOpen,
    mobileInspectorTitle,
    mobileNavOpen,
    mobileSelectionMode,
    mounts,
    notice,
    openBatchDownloadDialog,
    openCreateFolderDialog,
    openCurrentDirectoryShareDialog,
    openDeleteDialog,
    openMoveCopyDialog,
    openRenameDialog,
    openShareDialog,
    openSharesPanel,
    openTasksPanel,
    openTrashPanel,
    preview,
    previewEntry,
    refreshCurrentView,
    resolvedTheme,
    searchQuery,
    searchText,
    selectedEntries,
    setFullScreenImage,
    setMobileSelectionMode,
    setTaskPanelCollapsed,
    setThemeMode,
    setViewMode,
    shareTarget,
    shares,
    showHidden,
    singleMountMode,
    submitDialog,
    submitTaskDeleteDialog,
    taskDeleteDialog,
    taskPanelCollapsed,
    tasks,
    themeMode,
    trashItems,
    treeCache,
    user,
    viewMode,
    visibleFilesCount,
    visibleFoldersCount,
    visibleRows,
  };
}

import {
	startTransition,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type {
	EditorDocument,
	FileEntry,
	FileTreeNode,
	MountRoot,
	SearchHit,
	SessionUser,
	TrashItem,
	TransferTask,
} from "./types/contracts/index";
import { LoginForm } from "./features/auth/LoginForm";
import { FileTable } from "./features/files/FileTable";
import { MaterialIcon } from "./features/shared/Icons";
import { ResizableSidebar } from "./features/shared/ResizableSidebar";
import { api, rawFileUrl } from "./api";
import {
	readStoredShowHidden,
	readStoredThemeMode,
	readStoredViewMode,
	useMediaQuery,
	buildBreadcrumbs,
	sortEntries,
	extensionFromPath,
	clearInspector,
	hasHiddenPath,
	loadFiles,
	loadTree,
	mergeTasks,
	sameEntry,
	basename,
	getSingleMountId,
	defaultTargetDir,
	normalizeDirectory,
	treeCacheKey,
	dirname,
} from "./utils";
import {
	InspectorMode,
	Notice,
	OperationDialog,
	ThemeMode,
	ViewMode,
} from "./types/home";
import {
	MOBILE_MEDIA_QUERY,
	SHOW_HIDDEN_STORAGE_KEY,
	THEME_STORAGE_KEY,
	VIEW_MODE_STORAGE_KEY,
} from "./static";
import { InspectorPane } from "./pages/InspectorPane";
import { OperationDialogView } from "./pages/OperationDialogView";
import { AppSidebar } from "./pages/AppSidebar";
import { AppHeader } from "./pages/AppHeader";
import { AppToolbar } from "./pages/AppToolbar";

export function App() {
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
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
	const [inspectorOpen, setInspectorOpen] = useState(true);
	const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const inspectRequestRef = useRef(0);
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

	// ─── Effects ───
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
		setSelectedEntries([]);
		clearInspector(inspectRequestRef, setPreview, setEditor);
		setInspectorMode("preview");
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
		setSelectedEntries([]);
		clearInspector(inspectRequestRef, setPreview, setEditor);
		setInspectorMode("preview");
		setMobileNavOpen(false);
		setMobileInspectorOpen(false);
		setInspectorOpen(true);
	}, [currentPath, editor, preview, showHidden]);

	useEffect(() => {
		if (!isMobile) {
			setMobileNavOpen(false);
			setMobileInspectorOpen(false);
		}
	}, [isMobile]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (fullScreenImage) {
					setFullScreenImage(null);
				} else if (dialog) {
					setDialog(null);
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [fullScreenImage, dialog]);

	useEffect(() => {
		if (!user || !currentMountId) return;
		void loadFiles(
			currentMountId,
			currentPath,
			searchQuery,
			setEntries,
			setSelectedEntries,
			showHidden,
		);
		void loadTree(currentMountId, "/", showHidden, setTreeCache);
		if (currentPath !== "/")
			void loadTree(
				currentMountId,
				currentPath,
				showHidden,
				setTreeCache,
			);
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
				.catch((e: Error) =>
					setNotice({ tone: "error", text: e.message }),
				);
		}, 180);
		return () => window.clearTimeout(handle);
	}, [searchQuery, showHidden, user]);

	useEffect(() => {
		if (!tasks.length) return;
		const active = tasks.filter(
			(t) => t.status === "pending" || t.status === "running",
		);
		if (!active.length) return;
		const handle = window.setInterval(() => {
			void Promise.all(active.map((t) => api.task(t.id)))
				.then((next) => setTasks((prev) => mergeTasks(prev, next)))
				.catch((e: Error) =>
					setNotice({ tone: "error", text: e.message }),
				);
		}, 1500);
		return () => window.clearInterval(handle);
	}, [tasks]);

	useEffect(() => {
		if (hasActiveTask) setTaskPanelCollapsed(false);
	}, [hasActiveTask]);
	useEffect(() => {
		if (inspectorMode === "editor" && !canEditActiveEntry)
			setInspectorMode("preview");
	}, [canEditActiveEntry, inspectorMode]);

	useEffect(() => {
		if (!dialog) return;
		const closeOnEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !dialog.submitting) setDialog(null);
		};
		window.addEventListener("keydown", closeOnEscape);
		return () => window.removeEventListener("keydown", closeOnEscape);
	}, [dialog]);

	// Notice auto-dismiss
	useEffect(() => {
		if (!notice) return;
		const t = window.setTimeout(() => setNotice(null), 4000);
		return () => window.clearTimeout(t);
	}, [notice]);

	// ─── Async handlers (unchanged logic) ───
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
		setCurrentMountId((ex) =>
			ex && list.some((i) => i.id === ex) ? ex : (list[0]?.id ?? ""),
		);
		setCurrentPath("/");
	}

	async function loadRuntimeData() {
		const [taskList, trashList] = await Promise.all([
			api.tasks(),
			api.trash(),
		]);
		setTasks(taskList);
		setTrashItems(trashList);
	}

	async function reloadTrash() {
		setTrashItems(await api.trash());
	}
	async function reloadSearchResults() {
		if (searchQuery)
			setSearchResults(await api.search(searchQuery, showHidden));
	}

	async function handleLogin(u: string, p: string) {
		const me = await api.login(u, p);
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
		setInspectorOpen(true);
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
			if (
				nextPreview.kind === "text" ||
				nextPreview.kind === "markdown"
			) {
				const doc = await api.getContent(entry.mountId, entry.path);
				if (requestId !== inspectRequestRef.current) return;
				setEditor(doc);
			} else {
				setEditor(null);
			}
			setInspectorMode("preview");
			setInspectorOpen(true);
			if (revealOnMobile && isMobile) setMobileInspectorOpen(true);
		} catch (e) {
			if (requestId !== inspectRequestRef.current) return;
			clearInspector(inspectRequestRef, setPreview, setEditor);
			setNotice({
				tone: "error",
				text: e instanceof Error ? e.message : "加载预览失败",
			});
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
		const exists = selectedEntries.some((i) => sameEntry(i, entry));
		commitSelection(
			exists
				? selectedEntries.filter((i) => !sameEntry(i, entry))
				: [...selectedEntries, entry],
			false,
		);
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
		if (
			!activeEntry ||
			!sameEntry(activeEntry, entry) ||
			inspectorMode !== "preview"
		)
			commitSelection([entry], true);
		else if (isMobile) setMobileInspectorOpen(true);
	}

	async function refreshCurrentView() {
		if (!currentMountId) return;
		const loads = [loadTree(currentMountId, "/", showHidden, setTreeCache)];
		if (currentPath !== "/")
			loads.push(
				loadTree(currentMountId, currentPath, showHidden, setTreeCache),
			);
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
	function openMoveCopyDialog(
		kind: "move" | "copy",
		entriesArg = selectedEntries,
	) {
		if (!entriesArg.length) {
			setNotice({ tone: "error", text: "请先选择文件或目录。" });
			return;
		}
		const mountId = getSingleMountId(entriesArg);
		if (!mountId) {
			setNotice({
				tone: "error",
				text: "批量操作暂不支持跨挂载点选择。",
			});
			return;
		}
		setDialog({
			kind,
			entries: entriesArg,
			targetDir: defaultTargetDir(
				entriesArg,
				currentMountId,
				currentPath,
			),
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
			setNotice({
				tone: "error",
				text: "删除操作暂不支持跨挂载点选择。",
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
			setNotice({ tone: "error", text: "请先选择要下载的项目。" });
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
				text: "批量下载暂不支持跨挂载点选择。",
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
	function openTasksPanel() {
		setInspectorMode("tasks");
		setTaskPanelCollapsed(false);
		setInspectorOpen(true);
		if (isMobile) setMobileInspectorOpen(true);
	}
	function openTrashPanel() {
		setInspectorMode("trash");
		setInspectorOpen(true);
		if (isMobile) setMobileInspectorOpen(true);
	}

	async function submitDialog() {
		if (!dialog) return;
		setDialog((c) => (c ? { ...c, submitting: true, error: "" } : c));
		try {
			if (dialog.kind === "create-folder") {
				const name = dialog.value.trim();
				if (!name) throw new Error("请输入目录名称。");
				if (!currentMountId) throw new Error("当前没有可用挂载点。");
				await api.createFolder(currentMountId, currentPath, name);
				setDialog(null);
				await refreshCurrentView();
				setNotice({ tone: "info", text: `已创建 ${name}` });
				return;
			}
			if (dialog.kind === "rename") {
				const nextName = dialog.value.trim();
				if (!nextName) throw new Error("请输入新的名称。");
				await api.rename(
					dialog.entry.mountId,
					dialog.entry.path,
					nextName,
				);
				setDialog(null);
				setSelectedEntries([]);
				clearInspector(inspectRequestRef, setPreview, setEditor);
				await refreshCurrentView();
				setNotice({ tone: "info", text: "重命名成功" });
				return;
			}
			if (dialog.kind === "move" || dialog.kind === "copy") {
				const mountId = getSingleMountId(dialog.entries);
				if (!mountId) throw new Error("批量操作暂不支持跨挂载点选择。");
				const targetDir = normalizeDirectory(dialog.targetDir);
				if (!targetDir) throw new Error("请输入目标目录。");
				await Promise.all(
					dialog.entries.map((e) =>
						dialog.kind === "move"
							? api.move(mountId, e.path, targetDir)
							: api.copy(mountId, e.path, targetDir),
					),
				);
				setDialog(null);
				setSelectedEntries([]);
				clearInspector(inspectRequestRef, setPreview, setEditor);
				await refreshCurrentView();
				setNotice({
					tone: "info",
					text: dialog.kind === "move" ? "移动完成" : "复制完成",
				});
				return;
			}
			if (dialog.kind === "delete") {
				const mountId = getSingleMountId(dialog.entries);
				if (!mountId) throw new Error("删除操作暂不支持跨挂载点选择。");
				await Promise.all(
					dialog.entries.map((e) => api.remove(mountId, e.path)),
				);
				setDialog(null);
				setSelectedEntries([]);
				clearInspector(inspectRequestRef, setPreview, setEditor);
				await refreshCurrentView();
				setNotice({ tone: "info", text: "已移入垃圾桶" });
				return;
			}
			if (dialog.kind === "batch-download") {
				const mountId = getSingleMountId(dialog.entries);
				if (!mountId) throw new Error("批量下载暂不支持跨挂载点选择。");
				const archiveName = dialog.value.trim() || "bundle.zip";
				const task = await api.batchDownload(
					mountId,
					dialog.entries.map((e) => e.path),
					archiveName,
				);
				setTasks((prev) => mergeTasks(prev, [task]));
				setTaskPanelCollapsed(false);
				setDialog(null);
				setNotice({ tone: "info", text: "已创建下载任务" });
				openTasksPanel();
				setInspectorOpen(true);
			}
		} catch (e) {
			setDialog((c) =>
				c
					? {
							...c,
							submitting: false,
							error: e instanceof Error ? e.message : "操作失败",
						}
					: c,
			);
		}
	}

	async function handleUpload(files: FileList | null) {
		if (!files || !currentMountId) return;
		const task = await api.upload(currentMountId, currentPath, files);
		setTasks((prev) => mergeTasks(prev, [task]));
		setTaskPanelCollapsed(false);
		await refreshCurrentView();
		setNotice({ tone: "info", text: task.detail });
		openTasksPanel();
	}

	async function handleOpenTask(taskId: string) {
		const task = await api.task(taskId);
		setTasks((prev) => mergeTasks(prev, [task]));
		setInspectorMode("tasks");
		if (task.status === "success" && task.downloadUrl)
			window.open(
				api.taskDownloadUrl(task.id),
				"_blank",
				"noopener,noreferrer",
			);
		if (isMobile) setMobileInspectorOpen(true);
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
		setNotice({ tone: "info", text: "保存成功" });
	}

	async function handleRestoreTrash(id: string) {
		const result = await api.restoreTrash([id]);
		await reloadTrash();
		setNotice({
			tone: result.conflicts.length ? "error" : "info",
			text: result.conflicts.length
				? `恢复失败：${result.conflicts.join("、")}`
				: "已恢复到原位置",
		});
	}

	async function handleDeleteTrash(id: string) {
		const result = await api.deleteTrash([id]);
		await reloadTrash();
		setNotice({
			tone: result.missing.length ? "error" : "info",
			text: result.missing.length
				? `删除失败：${result.missing.join("、")}`
				: "已彻底删除",
		});
	}

	// ─── Render ───
	if (loadingSession) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
				<div className="flex flex-col items-center gap-4">
					<div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white animate-pulse">
						<span className="material-symbols-outlined">cloud</span>
					</div>
					<p className="text-slate-500 text-sm">
						正在连接你的工作区...
					</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<LoginForm
				notice={notice}
				onLogin={handleLogin}
				onThemeModeChange={setThemeMode}
				resolvedTheme={resolvedTheme}
				themeMode={themeMode}
			/>
		);
	}

	const InspectorPane_ = (
		<InspectorPane
			{...{
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
				onImagePreview: setFullScreenImage,
			}}
		/>
	);

	return (
		<div className="flex h-screen overflow-hidden bg-bg-light dark:bg-bg-dark text-slate-900 dark:text-slate-100 font-display">
			{/* ─── Sidebar ─── */}
			<AppSidebar
				currentMountId={currentMountId}
				currentMountPath={currentMount?.path || "/"}
				currentPath={currentPath}
				expandedPaths={expandedPaths}
				isMobile={isMobile}
				mobileNavOpen={mobileNavOpen}
				mounts={mounts}
				showHidden={showHidden}
				singleMountMode={singleMountMode}
				tasksLength={tasks.length}
				trashItemsLength={trashItems.length}
				treeCache={treeCache}
				onCloseMobileNav={() => setMobileNavOpen(false)}
				onNavigateHome={() => {
					setCurrentPath("/");
					setMobileNavOpen(false);
				}}
				onOpenTasks={openTasksPanel}
				onOpenTrash={openTrashPanel}
				onRefresh={() => void refreshCurrentView()}
				onSelectTree={(mountId, path) => {
					clearInspector(inspectRequestRef, setPreview, setEditor);
					setSelectedEntries([]);
					setInspectorMode("preview");
					setCurrentMountId(mountId);
					setCurrentPath(path);
					setMobileNavOpen(false);
				}}
				onToggleTree={async (mountId, path) => {
					setExpandedPaths((prev) =>
						prev.includes(path)
							? prev.filter((i) => i !== path)
							: [...prev, path],
					);
					if (!treeCache[treeCacheKey(mountId, path, showHidden)])
						await loadTree(mountId, path, showHidden, setTreeCache);
				}}
			/>

			{/* Mobile overlay */}
			{isMobile && mobileNavOpen ? (
				<div
					className="fixed inset-0 bg-black/30 z-20"
					onClick={() => setMobileNavOpen(false)}
				/>
			) : null}

			{/* ─── Main Content ─── */}
			<main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-bg-dark">
				{/* Header */}
				<AppHeader
					breadcrumbs={breadcrumbs}
					isMobile={isMobile}
					searchText={searchText}
					showHidden={showHidden}
					viewMode={viewMode}
					onLogout={() => void handleLogout()}
					onNavigateBreadcrumb={(path) => {
						clearInspector(
							inspectRequestRef,
							setPreview,
							setEditor,
						);
						setSelectedEntries([]);
						setInspectorMode("preview");
						setCurrentPath(path);
					}}
					onNavigateUp={() => {
						if (currentPath !== "/") {
							setCurrentPath(dirname(currentPath));
						}
					}}
					onOpenMobileNav={() => setMobileNavOpen(true)}
					onRefresh={() => void refreshCurrentView()}
					onSearchChange={(val) =>
						startTransition(() => setSearchText(val))
					}
					onSetTheme={setThemeMode}
					onToggleShowHidden={() => setShowHidden((p) => !p)}
					onToggleViewMode={setViewMode}
				/>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-8 relative">
					{/* Toolbar */}
					<AppToolbar
						foldersCount={visibleRows.filter((e) => e.isDir).length}
						filesCount={visibleRows.filter((e) => !e.isDir).length}
						hasSelection={selectedEntries.length > 0}
						isSingleSelection={selectedEntries.length === 1}
						onBatchDownload={() => openBatchDownloadDialog()}
						onCreateFolder={openCreateFolderDialog}
						onDelete={() => openDeleteDialog()}
						onMoveCopy={(kind) => openMoveCopyDialog(kind)}
						onRename={() => openRenameDialog()}
						onUploadClick={() => fileInputRef.current?.click()}
					/>

					{/* Search results banner */}
					{searchQuery ? (
						<div className="mb-4 flex items-center gap-3 px-2">
							<span className="text-xs uppercase tracking-wider text-slate-400">
								Search
							</span>
							<strong className="text-sm">
								{visibleRows.length} 条结果
							</strong>
							<span className="text-xs text-slate-400">
								"{searchQuery}"
							</span>
						</div>
					) : null}

					{/* File table / grid */}
					<FileTable
						entries={visibleRows}
						viewMode={viewMode}
						onActivate={handleActivateEntry}
						onCopy={(e) => openMoveCopyDialog("copy", [e])}
						onDelete={(e) => openDeleteDialog([e])}
						onDownload={(e) => openBatchDownloadDialog([e])}
						onMove={(e) => openMoveCopyDialog("move", [e])}
						onRename={(e) => openRenameDialog(e)}
						onToggleSelection={handleToggleSelection}
						onToggleAllSelection={(selectAll) => {
							if (selectAll) {
								setSelectedEntries(visibleRows);
							} else {
								setSelectedEntries([]);
							}
						}}
						selectedEntries={selectedEntries}
						showPath={Boolean(searchQuery)}
					/>

					{/* Notice Toast */}
					{notice ? (
						<div
							className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in ${
								notice.tone === "error"
									? "bg-red-500 text-white"
									: "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
							}`}
						>
							{notice.text}
						</div>
					) : null}
				</div>

				<input
					ref={fileInputRef}
					hidden
					multiple
					type="file"
					onChange={(e) => void handleUpload(e.target.files)}
				/>
			</main>

			{/* ─── Inspector Panel (Right) ─── */}
			{!isMobile && inspectorOpen ? (
				<ResizableSidebar
					side="right"
					defaultWidth={320}
					minWidth={280}
					maxWidth={500}
					className="border-l border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-bg-dark/50 backdrop-blur-md overflow-hidden relative transition-colors"
				>
					{InspectorPane_}
				</ResizableSidebar>
			) : null}

			{/* Floating Sidebar Toggle (Desktop) */}
			{!isMobile && (
				<button
					className={`fixed top-1/2 -translate-y-1/2 z-40 flex items-center justify-center transition-all duration-300 ${
						inspectorOpen
							? "w-4 h-12 bg-white dark:bg-bg-dark border border-r-0 border-slate-200 dark:border-slate-800 rounded-l-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:w-8 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-[-4px_0_12px_rgba(0,0,0,0.02)]"
							: "w-12 h-12 bg-white/60 dark:bg-bg-dark/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-full text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:scale-110 hover:bg-white dark:hover:bg-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
					}`}
					style={{
						right: inspectorOpen
							? "var(--inspector-width, 320px)"
							: "24px",
					}}
					onClick={() => setInspectorOpen((p) => !p)}
					title={inspectorOpen ? "隐藏侧边栏" : "显示侧边栏"}
				>
					<MaterialIcon
						name={
							inspectorOpen ? "chevron_right" : "vertical_split"
						}
						className="text-xl"
					/>
				</button>
			)}

			{/* Mobile Inspector */}
			{isMobile && mobileInspectorOpen ? (
				<>
					<div
						className="fixed inset-0 bg-black/30 z-20"
						onClick={() => setMobileInspectorOpen(false)}
					/>
					<aside className="fixed inset-y-0 right-0 w-80 z-30 bg-white dark:bg-bg-dark border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto">
						<div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
							<span className="text-sm font-bold">
								{inspectorMode === "trash"
									? "垃圾桶"
									: inspectorMode === "tasks"
										? "任务"
										: "工作区"}
							</span>
							<button
								className="p-1 text-slate-400"
								onClick={() => setMobileInspectorOpen(false)}
								type="button"
							>
								<MaterialIcon name="close" />
							</button>
						</div>
						{InspectorPane_}
					</aside>
				</>
			) : null}

			{/* Fullscreen Image Preview */}
			{fullScreenImage ? (
				<div
					className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
					onClick={() => setFullScreenImage(null)}
				>
					<button
						className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
						onClick={() => setFullScreenImage(null)}
						type="button"
					>
						<MaterialIcon name="close" className="text-2xl block" />
					</button>
					<img
						src={fullScreenImage}
						alt="Fullscreen Preview"
						className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-sm"
						onClick={(e) => e.stopPropagation()}
					/>
				</div>
			) : null}

			{/* ─── Dialog ─── */}
			{dialog ? (
				<OperationDialogView
					dialog={dialog}
					onChange={(value) => {
						setDialog((c) => {
							if (!c) return c;
							if (
								c.kind === "create-folder" ||
								c.kind === "rename" ||
								c.kind === "batch-download"
							)
								return { ...c, value, error: "" };
							if (c.kind === "move" || c.kind === "copy")
								return { ...c, targetDir: value, error: "" };
							return c;
						});
					}}
					onClose={() => {
						if (!dialog.submitting) setDialog(null);
					}}
					onSubmit={() => void submitDialog()}
				/>
			) : null}
		</div>
	);
}

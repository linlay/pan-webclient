import { EditorPane } from "@/features/editor/EditorPane";
import { FileTable } from "@/features/files/FileTable";
import { MobilePreviewSheet } from "@/features/preview/MobilePreviewSheet";
import { MaterialIcon } from "@/features/shared/Icons";
import { ResizableSidebar } from "@/features/shared/ResizableSidebar";
import { ShareDialog } from "@/features/share/ShareDialog";
import { TaskDeleteDialog } from "@/features/tasks/TaskDeleteDialog";
import { AppHeader } from "@/pages/AppHeader";
import { InspectorPane } from "@/pages/InspectorPane";
import { AppSidebar } from "@/pages/AppSidebar";
import { AppToolbar } from "@/pages/AppToolbar";
import { MobileFAB } from "@/pages/MobileFAB";
import { OperationDialogView } from "@/pages/OperationDialogView";
import { useTranslation } from "react-i18next";
import { useAppController } from "./useAppController";

type AppShellProps = ReturnType<typeof useAppController>;

export function AppShell(props: AppShellProps) {
	const { t } = useTranslation();
	const desktopPreviewOpen = Boolean(
		!props.isMobile &&
			props.inspectorMode === "preview" &&
			props.preview &&
			props.activeEntry &&
			!props.activeEntry.isDir,
	);
	const desktopEditorOpen = Boolean(
		!props.isMobile &&
			props.inspectorMode === "editor" &&
			props.editor &&
			props.activeEntry &&
			!props.activeEntry.isDir,
	);
	const inspectorPane = (
		<InspectorPane
			activeEntry={props.activeEntry}
			canEditActiveEntry={props.canEditActiveEntry}
			currentMount={props.currentMount}
			currentPath={props.currentPath}
			deletingShareId={props.deletingShareId}
			editor={props.editor}
			handleCancelTask={props.handleCancelTask}
			handleCopyShare={props.handleCopyShare}
			handleDeleteShare={props.handleDeleteShare}
			handleDeleteTask={props.handleDeleteTask}
			handleDeleteTrash={props.handleDeleteTrash}
			handleOpenTask={props.handleOpenTask}
			handleRestoreTrash={props.handleRestoreTrash}
			isMobile={props.isMobile}
			inspectorMode={props.inspectorMode}
			onBack={props.handleInspectorBack}
			onEnterEdit={props.handleEnterEdit}
			onImagePreview={props.setFullScreenImage}
			onClosePreview={
				desktopPreviewOpen ? props.handleCloseDesktopPreview : undefined
			}
			onRefreshShares={props.handleRefreshShares}
			onRefreshTrash={props.handleRefreshTrash}
			onSaveEditor={props.handleSaveEditor}
			onShowTasks={props.openTasksPanel}
			preview={props.preview}
			searchQuery={props.searchQuery}
			selectedEntries={props.selectedEntries}
			setTaskPanelCollapsed={props.setTaskPanelCollapsed}
			shares={props.shares}
			taskPanelCollapsed={props.taskPanelCollapsed}
			tasks={props.tasks}
			trashItems={props.trashItems}
		/>
	);

	return (
		<div className="tencent-flat flex h-screen overflow-hidden bg-transparent font-display text-body-text dark:text-[#f4f8ff]/92">
			<AppSidebar
				currentMountId={props.currentMountId}
				currentMountPath={props.currentMount?.path || "/"}
				currentPath={props.currentPath}
				expandedPaths={props.expandedPaths}
				isMobile={props.isMobile}
				mobileNavOpen={props.mobileNavOpen}
				mounts={props.mounts}
				showHidden={props.showHidden}
				sharesLength={props.shares.length}
				singleMountMode={props.singleMountMode}
				tasksLength={props.tasks.length}
				trashItemsLength={props.trashItems.length}
				treeCache={props.treeCache}
				onCloseMobileNav={props.handleCloseMobileNav}
				onNavigateHome={props.handleNavigateHome}
				onOpenShares={() => {
					props.openSharesPanel();
					props.handleCloseMobileNav();
				}}
				onOpenTasks={props.openTasksPanel}
				onOpenTrash={props.openTrashPanel}
				onRefresh={() => void props.refreshCurrentView()}
				onSelectTree={props.handleSelectTree}
				onToggleTree={props.handleToggleTree}
			/>

			{props.isMobile && props.mobileNavOpen ? (
				<div
					className="fixed inset-0 bg-black/30 z-20"
					onClick={props.handleCloseMobileNav}
				/>
			) : null}

			<main className="flex min-w-0 flex-1 flex-col bg-white/45 backdrop-blur-sm dark:bg-[linear-gradient(180deg,rgba(9,18,33,0.94),rgba(15,23,42,0.98))]">
				<AppHeader
					breadcrumbs={props.breadcrumbs}
					canShareCurrentFolder={props.canShareCurrentDirectory}
					isMobile={props.isMobile}
					searchText={props.searchText}
					showHidden={props.showHidden}
					viewMode={props.viewMode}
					onLogout={() => void props.handleLogout()}
					onNavigateBreadcrumb={props.handleNavigateBreadcrumb}
					onNavigateUp={props.handleNavigateUp}
					onOpenMobileNav={props.handleOpenMobileNav}
					onRefresh={() => void props.refreshCurrentView()}
					onSearchChange={props.handleSearchChange}
					onShareCurrentFolder={props.openCurrentDirectoryShareDialog}
					onSetTheme={props.setThemeMode}
					onToggleShowHidden={props.handleToggleShowHidden}
					onToggleViewMode={props.setViewMode}
				/>

				<div className="relative flex min-h-0 flex-1 flex-col p-4 sm:p-8">
					<div className="shrink-0">
						<AppToolbar
							canShareCurrentFolder={props.canShareCurrentDirectory}
							filesCount={props.visibleFilesCount}
							foldersCount={props.visibleFoldersCount}
							hasSelection={props.hasSelection}
							isMobile={props.isMobile}
							isSingleSelection={props.selectedEntries.length === 1}
							onBatchDownload={() => props.openBatchDownloadDialog()}
							onCreateFolder={props.openCreateFolderDialog}
							onDelete={() => props.openDeleteDialog()}
							onMoveCopy={(kind) => props.openMoveCopyDialog(kind)}
							onRename={() => props.openRenameDialog()}
							onRefresh={() => void props.refreshCurrentView()}
							onShareCurrentFolder={
								props.openCurrentDirectoryShareDialog
							}
							onShare={() => props.openShareDialog()}
							onUploadClick={() => props.fileInputRef.current?.click()}
						/>

						{props.searchQuery ? (
							<div className="mb-4 flex items-center gap-3 px-2">
								<span className="text-xs uppercase tracking-wider text-body-text/65 dark:text-[#97A3B7]/78">
									{t("common.search")}
								</span>
								<strong className="text-sm text-heading-text dark:text-white">
									{t("app.resultsCount", {
										count: props.visibleRows.length,
									})}
								</strong>
								<span className="text-xs text-body-text/70 dark:text-[#97A3B7]/78">
									"{props.searchQuery}"
								</span>
							</div>
						) : null}
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
						<FileTable
							entries={props.visibleRows}
							isMobile={props.isMobile}
							onActivate={props.handleActivateEntry}
							onCopy={(entry) =>
								props.openMoveCopyDialog("copy", [entry])
							}
							onDelete={(entry) => props.openDeleteDialog([entry])}
							onDownload={(entry) =>
								props.openBatchDownloadDialog([entry])
							}
							onMove={(entry) =>
								props.openMoveCopyDialog("move", [entry])
							}
							onRename={props.openRenameDialog}
							onSelectionModeChange={props.setMobileSelectionMode}
							onSetSelection={props.handleSetSelection}
							onShare={props.openShareDialog}
							onToggleAllSelection={props.handleToggleAllSelection}
							onToggleSelection={props.handleToggleSelection}
							selectedEntries={props.selectedEntries}
							selectionMode={props.mobileSelectionMode}
							showPath={Boolean(props.searchQuery)}
							viewMode={props.viewMode}
						/>
					</div>

					{props.notice ? (
						<div
							className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[6px] border px-5 py-3 text-sm font-medium animate-fade-in ${
								props.notice.tone === "error"
									? "border-red-500 bg-red-500 text-white"
									: "border-sidebar-border bg-white/95 text-heading-text dark:border-white/10 dark:bg-night-2 dark:text-white"
							}`}
						>
							{props.notice.text}
						</div>
					) : null}
				</div>

				<input
					ref={props.fileInputRef}
					hidden
					multiple
					type="file"
					onChange={(event) => void props.handleUpload(event.target.files)}
				/>
			</main>

			{!props.isMobile &&
			props.inspectorOpen &&
			!desktopPreviewOpen &&
			!desktopEditorOpen ? (
				<ResizableSidebar
					side="right"
					defaultWidth={320}
					minWidth={280}
					maxWidth={500}
					className="tencent-app-panel relative overflow-hidden border-l border-sidebar-border transition-colors dark:border-white/10"
				>
					{inspectorPane}
				</ResizableSidebar>
			) : null}

			{!props.isMobile && !desktopPreviewOpen && !desktopEditorOpen ? (
				<button
					className={`fixed top-1/2 -translate-y-1/2 z-40 flex items-center justify-center transition-all duration-300 ${
						props.inspectorOpen
							? "h-12 w-4 rounded-l-[6px] border border-r-0 border-sidebar-border bg-white/92 text-body-text/70 hover:w-8 hover:bg-panel-wash hover:text-heading-text dark:border-white/10 dark:bg-night-2 dark:text-[#97A3B7]/78 dark:hover:bg-night-3 dark:hover:text-white"
							: "h-12 w-12 rounded-full border border-sidebar-border bg-white/82 text-body-text/70 hover:scale-105 hover:bg-panel-wash hover:text-primary dark:border-white/10 dark:bg-night-2 dark:text-[#97A3B7]/78 dark:hover:bg-night-3 dark:hover:text-[#78A9FF]"
					}`}
					style={{
						right: props.inspectorOpen
							? "var(--inspector-width, 320px)"
							: "24px",
					}}
					onClick={props.handleToggleInspector}
					title={
						props.inspectorOpen
							? t("app.hideSidebar")
							: t("app.showSidebar")
					}
				>
					<MaterialIcon
						name={
							props.inspectorOpen
								? "chevron_right"
								: "vertical_split"
						}
						className="text-xl"
					/>
				</button>
			) : null}

			{desktopPreviewOpen ? (
				<div
					className="fixed inset-0 z-[90] bg-slate-950/55 p-4 backdrop-blur-md animate-fade-in sm:p-6"
					onClick={props.handleCloseDesktopPreview}
				>
					<div
						className="relative h-full w-full overflow-hidden rounded-[20px] border border-sidebar-border bg-white/95 dark:border-white/10 dark:bg-night-0/98"
						onClick={(event) => event.stopPropagation()}
					>
						{inspectorPane}
					</div>
				</div>
			) : null}

			{desktopEditorOpen ? (
				<div className="fixed inset-0 z-[90] bg-slate-950/55 p-4 backdrop-blur-md animate-fade-in sm:p-6">
					<div className="h-full w-full overflow-hidden rounded-[20px] border border-sidebar-border bg-white/95 dark:border-white/10 dark:bg-night-0/98">
						<div className="h-full overflow-y-auto">
							<EditorPane
								activeEntry={props.activeEntry}
								editor={props.editor}
								onBack={props.handleInspectorBack}
								onClose={props.handleCloseDesktopPreview}
								onSave={props.handleSaveEditor}
								selectionCount={props.selectedEntries.length}
							/>
						</div>
					</div>
				</div>
			) : null}

			{props.isMobile &&
			props.mobileInspectorOpen &&
			props.inspectorMode !== "preview" ? (
				<aside className="fixed inset-0 z-30 flex flex-col overflow-hidden bg-white/95 animate-fade-in dark:bg-night-0/98">
					<div className="flex items-center justify-between border-b border-sidebar-border bg-white/90 px-4 py-4 dark:border-white/10 dark:bg-night-0/96">
						<span className="text-sm font-bold text-heading-text dark:text-white">
							{props.mobileInspectorTitle}
						</span>
						<button
							className="rounded-full p-1 text-body-text/70 transition-colors hover:bg-panel-wash hover:text-heading-text dark:text-[#97A3B7]/78 dark:hover:bg-night-3 dark:hover:text-white"
							onClick={props.handleCloseMobileInspector}
							type="button"
						>
							<MaterialIcon name="close" />
						</button>
					</div>
					<div className="flex-1 overflow-y-auto">{inspectorPane}</div>
				</aside>
			) : null}

			{props.isMobile &&
			props.inspectorMode === "preview" &&
			props.preview &&
			props.mobileInspectorOpen &&
			props.previewEntry ? (
				<MobilePreviewSheet
					preview={props.preview}
					isOpen={true}
					onClose={props.handleCloseMobileInspector}
					onImagePreview={props.setFullScreenImage}
					onDownload={() =>
						props.openBatchDownloadDialog([props.previewEntry!])
					}
					onRename={() => props.openRenameDialog(props.previewEntry!)}
					onMove={() =>
						props.openMoveCopyDialog("move", [props.previewEntry!])
					}
					onCopy={() =>
						props.openMoveCopyDialog("copy", [props.previewEntry!])
					}
					onDelete={() => props.openDeleteDialog([props.previewEntry!])}
				/>
			) : null}

			{props.isMobile ? (
				<MobileFAB
					onCreateFolder={props.openCreateFolderDialog}
					onUploadClick={() => props.fileInputRef.current?.click()}
				/>
			) : null}

			{props.fullScreenImage ? (
				<div
					className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
					onClick={props.handleCloseFullScreenImage}
				>
					<button
						className="absolute top-6 right-6 rounded-full border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
						onClick={props.handleCloseFullScreenImage}
						type="button"
					>
						<MaterialIcon name="close" className="text-2xl block" />
					</button>
					<img
						src={props.fullScreenImage}
						alt={t("preview.preview")}
						className="max-h-full max-w-full rounded-sm object-contain"
						onClick={(event) => event.stopPropagation()}
					/>
				</div>
			) : null}

			{props.dialog ? (
				<OperationDialogView
					dialog={props.dialog}
					directoryTree={props.dialogDirectoryTree}
					onChange={props.handleDialogChange}
					onClose={props.handleDialogClose}
					onSubmit={() => void props.submitDialog()}
				/>
			) : null}

			{props.taskDeleteDialog ? (
				<TaskDeleteDialog
					error={props.taskDeleteDialog.error}
					onClose={props.handleTaskDeleteDialogClose}
					onSubmit={() => void props.submitTaskDeleteDialog()}
					submitting={props.taskDeleteDialog.submitting}
					task={props.taskDeleteDialog.task}
				/>
			) : null}

			{props.shareTarget ? (
				<ShareDialog
					entry={props.shareTarget}
					onClose={props.handleShareDialogClose}
					onCreated={props.handleShareCreated}
				/>
			) : null}
		</div>
	);
}

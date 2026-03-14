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
import { useAppController } from "./useAppController";

type AppShellProps = ReturnType<typeof useAppController>;

export function AppShell(props: AppShellProps) {
	const inspectorPane = (
		<InspectorPane
			activeEntry={props.activeEntry}
			canEditActiveEntry={props.canEditActiveEntry}
			currentMount={props.currentMount}
			currentPath={props.currentPath}
			deletingShareId={props.deletingShareId}
			editor={props.editor}
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
		<div className="flex h-screen overflow-hidden bg-bg-light dark:bg-bg-dark text-slate-900 dark:text-slate-100 font-display">
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

			<main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-bg-dark">
				<AppHeader
					breadcrumbs={props.breadcrumbs}
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
					onSetTheme={props.setThemeMode}
					onToggleShowHidden={props.handleToggleShowHidden}
					onToggleViewMode={props.setViewMode}
				/>

				<div className="relative flex min-h-0 flex-1 flex-col p-4 sm:p-8">
					<div className="shrink-0">
						<AppToolbar
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
							onShare={() => props.openShareDialog()}
							onUploadClick={() => props.fileInputRef.current?.click()}
						/>

						{props.searchQuery ? (
							<div className="mb-4 flex items-center gap-3 px-2">
								<span className="text-xs uppercase tracking-wider text-slate-400">
									Search
								</span>
								<strong className="text-sm">
									{props.visibleRows.length} 条结果
								</strong>
								<span className="text-xs text-slate-400">
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
							className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in ${
								props.notice.tone === "error"
									? "bg-red-500 text-white"
									: "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
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

			{!props.isMobile && props.inspectorOpen ? (
				<ResizableSidebar
					side="right"
					defaultWidth={320}
					minWidth={280}
					maxWidth={500}
					className="border-l border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-bg-dark/50 backdrop-blur-md overflow-hidden relative transition-colors"
				>
					{inspectorPane}
				</ResizableSidebar>
			) : null}

			{!props.isMobile ? (
				<button
					className={`fixed top-1/2 -translate-y-1/2 z-40 flex items-center justify-center transition-all duration-300 ${
						props.inspectorOpen
							? "w-4 h-12 bg-white dark:bg-bg-dark border border-r-0 border-slate-200 dark:border-slate-800 rounded-l-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:w-8 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-[-4px_0_12px_rgba(0,0,0,0.02)]"
							: "w-12 h-12 bg-white/60 dark:bg-bg-dark/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-full text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:scale-110 hover:bg-white dark:hover:bg-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
					}`}
					style={{
						right: props.inspectorOpen
							? "var(--inspector-width, 320px)"
							: "24px",
					}}
					onClick={props.handleToggleInspector}
					title={props.inspectorOpen ? "隐藏侧边栏" : "显示侧边栏"}
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

			{props.isMobile &&
			props.mobileInspectorOpen &&
			props.inspectorMode !== "preview" ? (
				<aside className="fixed inset-0 z-30 flex flex-col overflow-hidden bg-white dark:bg-bg-dark animate-fade-in">
					<div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-bg-dark">
						<span className="text-sm font-bold">
							{props.mobileInspectorTitle}
						</span>
						<button
							className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
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
						className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
						onClick={props.handleCloseFullScreenImage}
						type="button"
					>
						<MaterialIcon name="close" className="text-2xl block" />
					</button>
					<img
						src={props.fullScreenImage}
						alt="Fullscreen Preview"
						className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-sm"
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

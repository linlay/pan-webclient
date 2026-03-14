import { PreviewPane } from "@/features/preview/PreviewPane";
import { MaterialIcon } from "@/features/shared/Icons";
import {
	buildShareTextFilename,
	formatBytes,
	formatDateTime,
	formatUploadProgress,
} from "@/utils";
import type { FileEntry, PreviewMeta, PublicShare } from "@/types/contracts";

export function SharePageContent(props: {
	share: PublicShare;
	isMobile: boolean;
	showMobilePropertiesPage: boolean;
	activeFilePreview: PreviewMeta | null;
	activeFileEntry: FileEntry | null;
	activePreviewPath: string | null;
	currentPath: string;
	entries: FileEntry[];
	canReadShare: boolean;
	canUploadToShare: boolean;
	isTextWriteMode: boolean;
	defaultTextFileName: string;
	textFileName: string;
	textFileContent: string;
	savingTextFile: boolean;
	uploading: boolean;
	uploadProgress: { loaded: number; total: number };
	onDismissMobileProperties: () => void;
	onGoBack?: () => void;
	onEntryOpen: (entry: FileEntry) => void;
	onTextContentChange: (value: string) => void;
	onTextFileNameChange: (value: string) => void;
	onSaveText: () => void;
	onPickLocalFile: () => void;
}) {
	const writePanel = props.canUploadToShare ? (
		props.isTextWriteMode ? (
			<ShareTextComposer
				currentPath={props.currentPath}
				defaultFileName={props.defaultTextFileName}
				fileName={props.textFileName}
				fileContent={props.textFileContent}
				isMobile={props.isMobile}
				onContentChange={props.onTextContentChange}
				onFileNameChange={props.onTextFileNameChange}
				onSave={props.onSaveText}
				saving={props.savingTextFile}
			/>
		) : (
			<ShareLocalUploadPanel
				currentPath={props.currentPath}
				isMobile={props.isMobile}
				onPickLocalFile={props.onPickLocalFile}
				uploading={props.uploading}
				uploadProgress={props.uploadProgress}
			/>
		)
	) : null;

	if (props.isMobile) {
		if (props.showMobilePropertiesPage) {
			return (
				<ShareMobileFileDetailsPanel
					activeFileEntry={props.activeFileEntry}
					activeFilePreview={props.activeFilePreview}
					currentPath={props.currentPath}
					share={props.share}
					onBack={props.share.isDir ? props.onDismissMobileProperties : undefined}
				/>
			);
		}

		return (
			<div className="flex flex-col bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(241,245,249,0.88))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]">
				{props.share.isDir ? (
					<div className="flex flex-col px-5 pb-5 pt-4">
						{writePanel ? <div className="mb-4 shrink-0">{writePanel}</div> : null}
						<ShareDirectoryListCard
							activePreviewPath={props.activePreviewPath}
							canReadShare={props.canReadShare}
							entries={props.entries}
							mobile={true}
							onBack={props.onGoBack}
							onEntryOpen={props.onEntryOpen}
						/>
					</div>
				) : (
					<ShareSingleFileHint mobile={true} />
				)}
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
			<div className="flex min-h-0 flex-col border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
				{props.share.isDir ? (
					<div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
						<ShareDirectoryListCard
							activePreviewPath={props.activePreviewPath}
							canReadShare={props.canReadShare}
							entries={props.entries}
							onBack={props.onGoBack}
							onEntryOpen={props.onEntryOpen}
						/>
					</div>
				) : (
					<ShareSingleFileHint />
				)}
			</div>

			<div className="min-h-0 flex-1 overflow-hidden border-t border-slate-200 dark:border-slate-800 lg:border-t-0">
				<div className="h-full overflow-hidden">
					{props.canUploadToShare ? (
						<div className="h-full overflow-y-auto overscroll-contain p-6">
							<div className="mx-auto flex min-h-full w-full max-w-lg items-center">
								{writePanel}
							</div>
						</div>
					) : props.activeFilePreview && props.activeFileEntry ? (
						<PreviewPane
							activeEntry={props.activeFileEntry}
							canEdit={false}
							currentMount={null}
							currentPath={props.currentPath}
							onEnterEdit={() => {}}
							onImagePreview={() => {}}
							onShowTasks={() => {}}
							preview={props.activeFilePreview}
							searchQuery=""
							selectedEntries={[]}
							taskCount={0}
						/>
					) : (
						<div className="flex h-full min-h-0 items-center justify-center p-6">
							<div className="max-w-sm rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
								<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
									<MaterialIcon name="description" className="text-2xl" />
								</div>
								<div className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
									目录不展示 Properties
								</div>
								<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
									请选择左侧单个文件查看属性、预览和下载内容。
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function ShareMobileFileDetailsPanel(props: {
	share: PublicShare;
	currentPath: string;
	activeFilePreview: PreviewMeta | null;
	activeFileEntry: FileEntry | null;
	onBack?: () => void;
}) {
	return (
		<div className="min-h-0 flex flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.96))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.98))]">
			<div className="flex items-center gap-3 border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
				{props.onBack ? (
					<button
						className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
						onClick={props.onBack}
						type="button"
					>
						<MaterialIcon name="arrow_back" className="text-lg" />
					</button>
				) : null}
				<div className="min-w-0">
					<div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">
						File Details
					</div>
					<div className="mt-1 truncate text-base font-semibold text-slate-900 dark:text-white">
						{props.activeFilePreview?.name ?? props.share.name}
					</div>
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-hidden">
				<PreviewPane
					activeEntry={props.activeFileEntry}
					canEdit={false}
					currentMount={null}
					currentPath={props.currentPath}
					onEnterEdit={() => {}}
					onImagePreview={() => {}}
					onShowTasks={() => {}}
					preview={props.activeFilePreview}
					searchQuery=""
					selectedEntries={[]}
					taskCount={0}
				/>
			</div>
		</div>
	);
}

function ShareDirectoryListCard(props: {
	entries: FileEntry[];
	activePreviewPath: string | null;
	canReadShare: boolean;
	mobile?: boolean;
	onBack?: () => void;
	onEntryOpen: (entry: FileEntry) => void;
}) {
	return (
		<div
			className={
				props.mobile
					? "flex min-h-[200px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/85 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
					: "flex min-h-0 max-h-[32dvh] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 lg:max-h-none"
			}
		>
			<div
				className={`flex shrink-0 items-center justify-between border-b border-slate-200 text-slate-400 dark:border-slate-800 ${
					props.mobile
						? "bg-slate-50/90 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] dark:bg-slate-800/70"
						: "bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] dark:bg-slate-800/50"
				}`}
			>
				<ShareDirectoryListHeader onBack={props.onBack} />
				<span>{props.entries.length} 项</span>
			</div>
			<div
				className={
					props.mobile
						? "min-h-[200px] p-2.5"
						: "min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain dark:divide-slate-800"
				}
			>
				{props.entries.length === 0 ? (
					<div
						className={
							props.mobile
								? "rounded-2xl bg-slate-50 px-4 py-12 text-center text-sm text-slate-400 dark:bg-slate-800/60"
								: "px-4 py-12 text-center text-sm text-slate-400"
						}
					>
						当前目录为空
					</div>
				) : props.mobile ? (
					<div className="space-y-2.5">
						{props.entries.map((entry) => (
							<ShareMobileDirectoryRow
								canReadShare={props.canReadShare}
								entry={entry}
								key={`${entry.mountId}:${entry.path}`}
								onOpen={props.onEntryOpen}
								selected={props.activePreviewPath === entry.path}
							/>
						))}
					</div>
				) : (
					props.entries.map((entry) => (
						<ShareDesktopDirectoryRow
							canReadShare={props.canReadShare}
							entry={entry}
							key={`${entry.mountId}:${entry.path}`}
							onOpen={props.onEntryOpen}
							selected={props.activePreviewPath === entry.path}
						/>
					))
				)}
			</div>
		</div>
	);
}

function ShareMobileDirectoryRow(props: {
	entry: FileEntry;
	selected: boolean;
	canReadShare: boolean;
	onOpen: (entry: FileEntry) => void;
}) {
	return (
		<button
			className={`flex w-full items-center gap-3 rounded-[22px] px-4 py-3.5 text-left transition-all ${
				props.selected
					? "bg-primary/6 ring-1 ring-primary/10"
					: "bg-slate-50/85 hover:bg-white dark:bg-slate-800/55 dark:hover:bg-slate-800"
			}`}
			onClick={() => props.onOpen(props.entry)}
			type="button"
		>
			<div
				className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
					props.entry.isDir
						? "bg-primary/10 text-primary"
						: "bg-slate-200/70 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300"
				}`}
			>
				<MaterialIcon
					name={props.entry.isDir ? "folder" : "draft"}
					className="text-xl"
				/>
			</div>
			<div className="min-w-0 flex-1">
				<div className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">
					{props.entry.name}
				</div>
				<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
					<span>
						{props.entry.isDir ? "目录" : formatBytes(props.entry.size)}
					</span>
					<span>·</span>
					<span>{formatDateTime(props.entry.modTime)}</span>
				</div>
			</div>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm dark:bg-slate-900/80">
				<MaterialIcon
					name={
						props.entry.isDir
							? "chevron_right"
							: props.canReadShare
								? "chevron_right"
								: "visibility_off"
					}
				/>
			</div>
		</button>
	);
}

function ShareDesktopDirectoryRow(props: {
	entry: FileEntry;
	selected: boolean;
	canReadShare: boolean;
	onOpen: (entry: FileEntry) => void;
}) {
	return (
		<button
			className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
				props.selected
					? "bg-primary/5"
					: "hover:bg-slate-50 dark:hover:bg-slate-800/60"
			}`}
			onClick={() => props.onOpen(props.entry)}
			type="button"
		>
			<div
				className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
					props.entry.isDir
						? "bg-primary/10 text-primary"
						: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
				}`}
			>
				<MaterialIcon
					name={props.entry.isDir ? "folder" : "draft"}
					className="text-xl"
				/>
			</div>
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
					{props.entry.name}
				</div>
				<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
					<span>
						{props.entry.isDir ? "目录" : formatBytes(props.entry.size)}
					</span>
					<span>·</span>
					<span>{formatDateTime(props.entry.modTime)}</span>
				</div>
			</div>
			<MaterialIcon
				name={
					props.entry.isDir
						? "chevron_right"
						: props.canReadShare
							? "open_in_new"
							: "visibility_off"
				}
				className="text-slate-300"
			/>
		</button>
	);
}

function ShareDirectoryListHeader(props: { onBack?: () => void }) {
	if (!props.onBack) {
		return <span>当前目录</span>;
	}
	return (
		<button
			className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors hover:bg-white hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white"
			onClick={props.onBack}
			type="button"
		>
			<MaterialIcon name="arrow_back" className="text-sm" />
			返回上一级
		</button>
	);
}

function ShareSingleFileHint(props: { mobile?: boolean }) {
	return props.mobile ? (
		<div className="flex min-h-0 flex-1 items-center justify-center px-5 pb-5 pt-4">
			<div className="rounded-[28px] border border-slate-200 bg-white/85 px-5 py-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/80">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
					<MaterialIcon name="description" className="text-2xl" />
				</div>
				<div className="mt-4 text-base font-bold text-slate-900 dark:text-white">
					这是一个单文件分享
				</div>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					点击上方按钮可下载或保存，文件详情会单独展示。
				</p>
			</div>
		</div>
	) : (
		<div className="shrink-0 px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
			<div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-8 text-center dark:border-slate-800 dark:bg-slate-800/40 sm:py-10">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
					<MaterialIcon name="description" className="text-2xl" />
				</div>
				<div className="mt-4 text-base font-bold text-slate-900 dark:text-white sm:text-lg">
					这是一个单文件分享
				</div>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					右侧可以直接预览或下载文件内容。
				</p>
			</div>
		</div>
	);
}

function ShareTextComposer(props: {
	currentPath: string;
	defaultFileName: string;
	fileName: string;
	fileContent: string;
	isMobile?: boolean;
	onContentChange: (value: string) => void;
	onFileNameChange: (value: string) => void;
	onSave: () => void;
	saving: boolean;
}) {
	return (
		<div
			className={`w-full rounded-3xl border border-sky-200 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10 ${
				props.isMobile ? "px-4 py-4" : "px-6 py-7"
			}`}
		>
			<div className="flex items-start gap-3">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
					<MaterialIcon name="edit_note" className="text-2xl" />
				</div>
				<div className="min-w-0">
					<div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">
						Quick Note
					</div>
					<div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
						快速保存 Markdown 到当前目录
					</div>
					<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
						当前分享已固定为文本输入模式，这里填写的内容会保存成
						`.md` 文件。
					</p>
				</div>
			</div>

			<div className="mt-5 rounded-2xl bg-white/80 px-4 py-4 text-sm text-slate-600 shadow-sm dark:bg-slate-900/60 dark:text-slate-300 overflow-hidden">
				当前保存目录：{props.currentPath}
			</div>

			<div className="mt-5">
				<label className="block">
					<span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
						文件名
					</span>
					<input
						className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
						onChange={(event) => props.onFileNameChange(event.target.value)}
						placeholder={`留空默认使用 ${props.defaultFileName}`}
						type="text"
						value={props.fileName}
					/>
				</label>
			</div>

			<label className="mt-4 block">
				<span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
					主体信息
				</span>
				<textarea
					className={`w-full resize-none rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
						props.isMobile ? "min-h-[180px]" : "min-h-[220px]"
					}`}
					onChange={(event) => props.onContentChange(event.target.value)}
					placeholder="输入要保存的 Markdown 内容。"
					value={props.fileContent}
				/>
			</label>

			<div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
				最终文件名：
				{buildShareTextFilename(props.fileName, props.defaultFileName)}
			</div>

			<button
				className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
				disabled={props.saving}
				onClick={props.onSave}
				type="button"
			>
				<MaterialIcon
					name={props.saving ? "sync" : "save"}
					className={props.saving ? "animate-spin" : ""}
				/>
				{props.saving ? "保存中..." : "保存 Markdown 到当前目录"}
			</button>
		</div>
	);
}

function ShareLocalUploadPanel(props: {
	currentPath: string;
	isMobile?: boolean;
	onPickLocalFile: () => void;
	uploading: boolean;
	uploadProgress: { loaded: number; total: number };
}) {
	return (
		<div
			className={`w-full rounded-3xl border border-sky-200 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10 ${
				props.isMobile ? "px-4 py-4" : "px-6 py-7"
			}`}
		>
			<div className="flex items-start gap-3">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
					<MaterialIcon name="upload" className="text-2xl" />
				</div>
				<div className="min-w-0">
					<div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">
						Local File
					</div>
					<div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
						上传本地文件到当前目录
					</div>
					<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
						当前模式只保留本地文件上传，不显示文本输入区域。
					</p>
				</div>
			</div>

			<div className="mt-5 rounded-2xl bg-white/80 px-4 py-4 text-sm text-slate-600 shadow-sm dark:bg-slate-900/60 dark:text-slate-300">
				当前上传目录：{props.currentPath}
			</div>

			<button
				className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
				disabled={props.uploading}
				onClick={props.onPickLocalFile}
				type="button"
			>
				<MaterialIcon
					name={props.uploading ? "sync" : "upload"}
					className={props.uploading ? "animate-spin" : ""}
				/>
				{props.uploading
					? formatUploadProgress(props.uploadProgress)
					: "选择本地文件上传"}
			</button>
		</div>
	);
}

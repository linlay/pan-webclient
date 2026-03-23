import { useState, type DragEvent, type ReactNode } from "react";
import { PreviewPane } from "@/features/preview/PreviewPane";
import { MaterialIcon } from "@/features/shared/Icons";
import {
	buildShareTextFilename,
	formatBytes,
	formatDateTime,
	formatUploadProgress,
} from "@/utils";
import type { FileEntry, PreviewMeta, PublicShare } from "@/types/contracts";
import { useTranslation } from "react-i18next";

export function SharePageContent(props: {
	share: PublicShare;
	isMobile: boolean;
	showMobilePropertiesPage: boolean;
	downloadHref: string;
	activeFilePreview: PreviewMeta | null;
	activeFileEntry: FileEntry | null;
	activePreviewPath: string | null;
	currentPath: string;
	entries: FileEntry[];
	canReadShare: boolean;
	canUploadToShare: boolean;
	isTextWriteMode: boolean;
	defaultTextFileName: string;
	sessionUploadedEntries: FileEntry[];
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
	onDropFiles: (files: FileList | null) => void;
	onSaveText: () => void;
	onPickLocalFile: () => void;
}) {
	const { t } = useTranslation();
	const writePanel = props.canUploadToShare ? (
		props.isTextWriteMode ? (
			<ShareTextComposer
				currentPath={props.currentPath}
				defaultFileName={props.defaultTextFileName}
				fileName={props.textFileName}
				fileContent={props.textFileContent}
				isMobile={props.isMobile}
				shareDescription={props.share.description}
				onContentChange={props.onTextContentChange}
				onFileNameChange={props.onTextFileNameChange}
				onSave={props.onSaveText}
				saving={props.savingTextFile}
			/>
		) : (
			<ShareLocalUploadPanel
				currentPath={props.currentPath}
				isMobile={props.isMobile}
				shareDescription={props.share.description}
				onDropFiles={props.onDropFiles}
				onPickLocalFile={props.onPickLocalFile}
				uploading={props.uploading}
				uploadProgress={props.uploadProgress}
			/>
		)
	) : null;
	const writeOnlyShare = props.canUploadToShare && !props.canReadShare;

	if (writeOnlyShare) {
		return (
			<ShareWriteOnlyWorkspace
				currentPath={props.currentPath}
				isMobile={props.isMobile}
				isTextWriteMode={props.isTextWriteMode}
				sessionUploadedEntries={props.sessionUploadedEntries}
				share={props.share}
				writePanel={writePanel}
			/>
		);
	}

	if (props.isMobile) {
		if (props.showMobilePropertiesPage) {
			return (
				<ShareMobileFileDetailsPanel
					activeFileEntry={props.activeFileEntry}
					activeFilePreview={props.activeFilePreview}
					currentPath={props.currentPath}
					downloadHref={props.downloadHref}
					share={props.share}
					onBack={
						props.share.isDir
							? props.onDismissMobileProperties
							: undefined
					}
				/>
			);
		}

		return (
			<div className="flex flex-col bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(241,245,249,0.88))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]">
				{props.share.isDir ? (
					<div className="flex flex-col px-5 pb-5 pt-4">
						{writePanel ? (
							<div className="mb-4 shrink-0">{writePanel}</div>
						) : null}
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
									<MaterialIcon
										name="description"
										className="text-2xl"
									/>
								</div>
								<div className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
									{t("sharePage.content.directoryNoPropertiesTitle")}
								</div>
								<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
									{t("sharePage.content.directoryNoPropertiesDescription")}
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function ShareWriteOnlyWorkspace(props: {
	share: PublicShare;
	currentPath: string;
	isMobile: boolean;
	isTextWriteMode: boolean;
	sessionUploadedEntries: FileEntry[];
	writePanel: ReactNode;
}) {
	const hasUploads = props.sessionUploadedEntries.length > 0;

	return (
		<div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.9))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]">
			<div className="pointer-events-none absolute left-[-6rem] top-0 h-60 w-60 rounded-full bg-sky-200/45 blur-3xl dark:bg-sky-500/10" />
			<div className="pointer-events-none absolute bottom-[-5rem] right-[-4rem] h-72 w-72 rounded-full bg-orange-100/55 blur-3xl dark:bg-orange-500/10" />
			<div
				className={
					props.isMobile
						? "relative flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5 pt-4"
						: "relative min-h-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8"
				}
			>
				<div
					className={`mx-auto grid w-full gap-4 ${
						props.isMobile
							? "min-h-full max-w-none flex-1 grid-cols-1"
							: hasUploads
								? "max-w-6xl lg:grid-cols-[minmax(0,1.18fr)_360px] lg:gap-6"
								: ""
					} ${props.isTextWriteMode ? "min-h-full items-stretch" : ""}`}
				>
					<div
						className={
							props.isTextWriteMode
								? props.isMobile
									? "flex min-h-full flex-1 flex-col"
									: "flex min-h-full min-h-[560px] flex-1 flex-col"
								: ""
						}
					>
						{props.writePanel}
					</div>
					{hasUploads ? (
						<div className="flex flex-col gap-4 lg:gap-6">
							<ShareWriteUploadedListCard
								entries={props.sessionUploadedEntries}
							/>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

function ShareWriteDescriptionCard(props: {
	title: string | ReactNode;
	description: string;
}) {
	const [expanded, setExpanded] = useState(true);

	return (
		<div className="overflow-hidden">
			<button
				className="flex w-full items-center justify-between gap-3 px-1 py-1 text-left"
				onClick={() => setExpanded((prev) => !prev)}
				type="button"
			>
				<div className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
					{props.title}
				</div>
				<MaterialIcon
					className={`text-slate-300 transition-transform dark:text-slate-600 ${
						expanded ? "rotate-180" : ""
					}`}
					name="expand_more"
				/>
			</button>
			{expanded ? (
				<div className="px-1 pb-1 pt-2">
					<div className="text-sm leading-7 text-slate-400 dark:text-slate-500">
						<div className="whitespace-pre-wrap break-words">
							{props.description}
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

function ShareWriteUploadedListCard(props: { entries: FileEntry[] }) {
	const { t } = useTranslation();
	return (
		<div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white/90 shadow-[0_18px_38px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/80">
			<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/70">
				<div>
					<div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
						{t("sharePage.content.uploadedList")}
					</div>
				</div>
				<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700/70 dark:text-slate-300">
					{t("sharePage.content.uploadedCount", {
						count: props.entries.length,
					})}
				</div>
			</div>
			<div className="p-3">
				{props.entries.length === 0 ? (
					<div className="rounded-[24px] bg-slate-50 px-4 py-10 text-center text-sm text-slate-400 dark:bg-slate-800/70 dark:text-slate-500">
						{t("sharePage.content.noUploadedFiles")}
					</div>
				) : (
					<div className="space-y-2">
						{props.entries.map((entry, index) => (
							<div
								className="flex items-center gap-3 rounded-[22px] bg-slate-50 px-4 py-3 dark:bg-slate-800/70"
								key={`${entry.path}:${entry.modTime}:${index}`}
							>
								<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
									<MaterialIcon
										name="draft"
										className="text-lg"
									/>
								</div>
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
										{entry.name}
									</div>
									<div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
										{formatBytes(entry.size)}
									</div>
								</div>
								<MaterialIcon
									className="text-slate-300 dark:text-slate-500"
									name="check_circle"
								/>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function ShareWritePill(props: { children: ReactNode }) {
	return (
		<span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
			{props.children}
		</span>
	);
}

function ShareMobileFileDetailsPanel(props: {
	share: PublicShare;
	currentPath: string;
	downloadHref: string;
	activeFilePreview: PreviewMeta | null;
	activeFileEntry: FileEntry | null;
	onBack?: () => void;
}) {
	const { t } = useTranslation();
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
						{t("preview.properties")}
					</div>
					<div className="mt-1 truncate text-base font-semibold text-slate-900 dark:text-white">
						{props.activeFilePreview?.name ?? props.share.name}
					</div>
				</div>
				<a
					className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
					href={props.downloadHref}
				>
					<MaterialIcon name="download" className="text-lg" />
				</a>
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
	const { t } = useTranslation();
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
				<span>{t("files.itemsCount", { count: props.entries.length })}</span>
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
						{t("sharePage.content.currentDirectoryEmpty")}
					</div>
				) : props.mobile ? (
					<div className="space-y-2.5">
						{props.entries.map((entry) => (
							<ShareMobileDirectoryRow
								canReadShare={props.canReadShare}
								entry={entry}
								key={`${entry.mountId}:${entry.path}`}
								onOpen={props.onEntryOpen}
								selected={
									props.activePreviewPath === entry.path
								}
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
	const { t } = useTranslation();
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
						{props.entry.isDir
							? t("files.directory")
							: formatBytes(props.entry.size)}
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
	const { t } = useTranslation();
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
						{props.entry.isDir
							? t("files.directory")
							: formatBytes(props.entry.size)}
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
	const { t } = useTranslation();
	if (!props.onBack) {
		return <span>{t("sharePage.content.currentDirectory")}</span>;
	}
	return (
		<button
			className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors hover:bg-white hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white"
			onClick={props.onBack}
			type="button"
		>
			<MaterialIcon name="arrow_back" className="text-sm" />
			{t("sharePage.content.upOneLevel")}
		</button>
	);
}

function ShareSingleFileHint(props: { mobile?: boolean }) {
	const { t } = useTranslation();
	return props.mobile ? (
		<div className="flex min-h-0 flex-1 items-center justify-center px-5 pb-5 pt-4">
			<div className="rounded-[28px] border border-slate-200 bg-white/85 px-5 py-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/80">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
					<MaterialIcon name="description" className="text-2xl" />
				</div>
				<div className="mt-4 text-base font-bold text-slate-900 dark:text-white">
					{t("sharePage.content.singleFileShare")}
				</div>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					{t("sharePage.content.singleFileMobileHint")}
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
					{t("sharePage.content.singleFileShare")}
				</div>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					{t("sharePage.content.singleFileDesktopHint")}
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
	shareDescription?: string;
	onContentChange: (value: string) => void;
	onFileNameChange: (value: string) => void;
	onSave: () => void;
	saving: boolean;
}) {
	const { t } = useTranslation();
	return (
		<div
			className={`flex w-full flex-col ${
				props.isMobile ? "min-h-full flex-1" : "h-full min-h-0"
			}`}
		>
			<div className="flex items-start gap-3">
				<div className="w-full">
					<div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">
						{t("sharePage.content.quickNoteTitle")}
					</div>
					{props.shareDescription?.trim() ? (
						<div>
							<ShareWriteDescriptionCard
								title={
									<div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
										{t("sharePage.content.quickNoteTitle")}
									</div>
								}
								description={props.shareDescription}
							/>
						</div>
					) : null}
				</div>
			</div>
			<div className="mt-5">
				<label className="block">
					<span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
						{t("sharePage.content.fileName")}
					</span>
					<input
						className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
						onChange={(event) =>
							props.onFileNameChange(event.target.value)
						}
						placeholder={t("sharePage.content.fileNamePlaceholder", {
							name: props.defaultFileName,
						})}
						type="text"
						value={props.fileName}
					/>
				</label>
			</div>

			<label className="mt-4 flex min-h-0 flex-1 flex-col">
				<span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
					{t("sharePage.content.body")}
				</span>
				<textarea
					className={`w-full flex-1 resize-none rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
						props.isMobile ? "min-h-[200px]" : "min-h-[280px]"
					}`}
					onChange={(event) =>
						props.onContentChange(event.target.value)
					}
					placeholder={t("sharePage.content.bodyPlaceholder")}
					value={props.fileContent}
				/>
			</label>
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
				{props.saving
					? t("common.saving")
					: t("sharePage.content.saveMarkdownToFolder", {
							name: buildShareTextFilename(
								props.fileName,
								props.defaultFileName,
							),
						})}
			</button>
		</div>
	);
}

function ShareLocalUploadPanel(props: {
	currentPath: string;
	isMobile?: boolean;
	shareDescription?: string;
	onDropFiles: (files: FileList | null) => void;
	onPickLocalFile: () => void;
	uploading: boolean;
	uploadProgress: { loaded: number; total: number };
}) {
	const { t } = useTranslation();
	const [dragActive, setDragActive] = useState(false);
	const targetLabel =
		props.currentPath === "/"
			? t("sharePage.content.currentDirectory")
			: props.currentPath;

	function handleDragOver(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		if (props.uploading) return;
		event.dataTransfer.dropEffect = "copy";
		setDragActive(true);
	}

	function handleDragLeave(event: DragEvent<HTMLDivElement>) {
		const nextTarget = event.relatedTarget as Node | null;
		if (nextTarget && event.currentTarget.contains(nextTarget)) {
			return;
		}
		setDragActive(false);
	}

	function handleDrop(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setDragActive(false);
		if (props.uploading) return;
		props.onDropFiles(event.dataTransfer.files);
	}

	return (
		<div
			className={`w-full rounded-[34px] border border-sky-200 bg-[linear-gradient(180deg,rgba(239,248,255,0.98),rgba(255,255,255,0.98))] shadow-[0_24px_48px_rgba(14,165,233,0.1)] dark:border-sky-500/20 dark:bg-[linear-gradient(180deg,rgba(14,165,233,0.14),rgba(15,23,42,0.94))] ${
				props.isMobile ? "px-5 py-5" : "min-h-[460px] px-7 py-7"
			}`}
		>
			<div className={`flex items-start`}>
				<div className="w-full">
					<div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-500">
						{t("shares.writeMode.local")}
					</div>

					{props.shareDescription?.trim() ? (
						<div>
							<ShareWriteDescriptionCard
								title={
									<div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
										{t("sharePage.content.localFileTitle")}
									</div>
								}
								description={props.shareDescription}
							/>
						</div>
					) : null}
					<div className="mt-4 flex flex-wrap gap-2">
						<ShareWritePill>{targetLabel}</ShareWritePill>
						<ShareWritePill>{t("sharePage.content.multiFile")}</ShareWritePill>
						<ShareWritePill>{t("sharePage.content.autoSaveAfterUpload")}</ShareWritePill>
					</div>
				</div>
			</div>

			<div
				className={`mt-7 rounded-[30px] border border-dashed px-5 py-8 text-center transition-all sm:px-7 sm:py-10 ${
					dragActive
						? "border-sky-400 bg-sky-100/75 shadow-[0_20px_35px_rgba(56,189,248,0.18)] dark:border-sky-300 dark:bg-sky-500/15"
						: "border-sky-200 bg-white/78 dark:border-sky-500/20 dark:bg-slate-950/20"
				}`}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
			>
				<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-sky-100 text-sky-500 dark:bg-sky-500/15 dark:text-sky-300">
					<MaterialIcon
						name={
							props.uploading
								? "sync"
								: dragActive
									? "backup"
									: "upload"
						}
						className={
							props.uploading
								? "text-[2.2rem] animate-spin"
								: "text-[2.2rem]"
						}
					/>
				</div>
				<div className="mt-5 text-[1.45rem] font-bold text-slate-900 dark:text-white">
					{dragActive
						? t("sharePage.content.releaseToUpload")
						: props.uploading
							? formatUploadProgress(props.uploadProgress)
							: t("sharePage.content.dragFilesHere")}
				</div>
				<p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-300">
					{t("sharePage.content.chooseFilesHelp")}
				</p>
				<button
					className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#dd7a58] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(221,122,88,0.28)] transition-colors hover:bg-[#cf6945] disabled:cursor-not-allowed disabled:opacity-60"
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
						: t("sharePage.content.chooseFilesToUpload")}
				</button>
				<div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
					<span>{t("sharePage.content.dragUpload")}</span>
					<span>·</span>
					<span>{t("sharePage.content.batchSelection")}</span>
					<span>·</span>
					<span>{t("sharePage.content.uploadAutoPrompt")}</span>
				</div>
			</div>
		</div>
	);
}

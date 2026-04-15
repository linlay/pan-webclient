import type {
	FileEntry,
	MountRoot,
	PreviewMeta,
} from "../../types/contracts/index";
import { rawFileUrl } from "../../api";
import { resolveExternalUrl } from "../../api/routing";
import { renderMarkdown } from "../shared/markdown";
import { MaterialIcon } from "../shared/Icons";
import {
	describePreviewKind,
	formatBytes,
	formatDateTime,
	previewBgColor,
	previewIconName,
	previewTextColor,
} from "@/utils";
import { translate } from "@/i18n";
import { useTranslation } from "react-i18next";

export function PreviewPane(props: {
	preview: PreviewMeta | null;
	activeEntry: FileEntry | null;
	selectedEntries: FileEntry[];
	currentMount: MountRoot | null;
	currentPath: string;
	searchQuery: string;
	canEdit: boolean;
	onEnterEdit: () => void;
	onShowTasks: () => void;
	onImagePreview?: (url: string) => void;
	onClosePreview?: () => void;
	taskCount: number;
}) {
	const { t } = useTranslation();
	const entry = props.activeEntry;
	const immersivePreview = Boolean(props.onClosePreview);

	// Multi-selection
	if (props.selectedEntries.length > 1) {
		return (
			<div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 sm:p-6">
					<div className="mb-6 flex items-center justify-between">
						<h3 className="text-lg font-bold text-heading-text dark:text-white">
							{t("preview.selectedTitle", {
								count: props.selectedEntries.length,
							})}
						</h3>
					{props.taskCount > 0 ? (
						<button
							className="text-xs font-medium text-primary dark:text-[#78A9FF]"
							onClick={props.onShowTasks}
							type="button"
						>
							{t("preview.viewTasks", { count: props.taskCount })}
						</button>
					) : null}
				</div>
				<p className="mb-4 text-sm text-body-text/80 dark:text-[#c7d4eb]/68">
					{t("preview.selectedDescription")}
				</p>
				<div className="flex flex-wrap gap-2">
					{props.selectedEntries.slice(0, 5).map((item) => (
						<span
							className="rounded-full border border-sidebar-border bg-panel-wash px-3 py-1 text-xs dark:border-white/10 dark:bg-night-3/92 dark:text-[#d7e4fb]/82"
							key={`${item.mountId}:${item.path}`}
						>
							{item.name}
						</span>
					))}
					{props.selectedEntries.length > 5 ? (
						<span className="rounded-full bg-panel-wash px-3 py-1 text-xs text-body-text/60 dark:bg-night-3/92 dark:text-[#97A3B7]/78">
							+{props.selectedEntries.length - 5}
						</span>
					) : null}
				</div>
			</div>
		);
	}

	// Directory selected
	if (entry?.isDir) {
		return (
			<div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 sm:p-6">
				<div className="mb-6 flex items-center justify-between">
					<h3 className="text-lg font-bold">{t("preview.properties")}</h3>
				</div>
				<div className="mb-8 flex flex-col items-center gap-4">
					<div className="flex h-24 w-24 items-center justify-center rounded-[8px] bg-primary/10 sm:h-32 sm:w-32">
						<MaterialIcon
							name="folder"
							className="text-primary !text-6xl filled-icon"
						/>
					</div>
					<h4 className="text-md text-center font-bold text-heading-text dark:text-white">
						{entry.name}
					</h4>
					<p className="text-xs text-body-text/75 dark:text-[#97A3B7]/78">
						{t("preview.fileFolder")}
					</p>
				</div>
				<div className="space-y-4">
					<div className="flex justify-between text-sm">
						<span className="font-medium text-body-text/80 dark:text-[#97A3B7]/78">
							{t("preview.mount")}:
						</span>
						<span className="font-medium text-heading-text dark:text-white">
							{props.currentMount?.name ?? entry.mountId}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="font-medium text-body-text/80 dark:text-[#97A3B7]/78">
							{t("preview.location")}:
						</span>
						<span className="ml-4 truncate font-medium text-heading-text dark:text-white">
							{entry.path}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="font-medium text-body-text/80 dark:text-[#97A3B7]/78">
							{t("preview.modified")}:
						</span>
						<span className="font-medium text-heading-text dark:text-white">
							{formatDateTime(entry.modTime)}
						</span>
					</div>
				</div>
			</div>
		);
	}

	// No selection
	if (!entry || !props.preview) {
		return (
			<div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto p-6 py-16 text-center sm:py-20">
				<MaterialIcon
					name="touch_app"
					className="text-primary/25 dark:text-[#3E78FF]/28 !text-6xl mb-4"
				/>
					<h3 className="mb-2 text-lg font-bold text-heading-text dark:text-white">
						{props.currentMount?.name ?? t("preview.noMountSelected")}
					</h3>
					<p className="text-sm text-body-text/75 dark:text-[#97A3B7]/78">
						{props.searchQuery
							? t("preview.searching", { query: props.searchQuery })
							: t("preview.selectToView")}
					</p>
				{props.taskCount > 0 ? (
					<button
						className="mt-4 text-sm font-medium text-primary hover:underline dark:text-[#78A9FF]"
						onClick={props.onShowTasks}
						type="button"
					>
						{t("preview.viewTasks", { count: props.taskCount })}
					</button>
				) : null}
			</div>
		);
	}

	// File preview
	const streamUrl =
		(props.preview.streamUrl
			? resolveExternalUrl(props.preview.streamUrl)
			: null) ?? rawFileUrl(props.preview.mountId, props.preview.path);
	const fileMetaItems = [
		`${t("preview.modified")} ${formatDateTime(props.preview.modTime)}`,
		describePreviewKind(props.preview.kind, props.preview.mime),
		formatBytes(props.preview.size),
	];

	return (
		<div className="flex h-full min-h-0 flex-col p-4 sm:p-6">
			<div
				className={`shrink-0 overflow-hidden border px-4 py-4 sm:px-5 sm:py-5 ${
					immersivePreview
						? "rounded-[18px] border-sidebar-border bg-[linear-gradient(180deg,rgba(240,245,255,0.98),rgba(255,255,255,0.96))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(19,32,58,0.96),rgba(9,18,33,0.94))]"
						: "rounded-[12px] border-sidebar-border bg-white/84 dark:border-white/10 dark:bg-night-1/96"
				}`}
			>
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex min-w-0 items-start gap-4">
						<div
							className={`relative flex shrink-0 items-center justify-center overflow-hidden ${
								immersivePreview
									? "h-16 w-16 rounded-[22px]"
									: "h-14 w-14 rounded-2xl"
							} ${previewBgColor(props.preview)} group ring-1 ring-white/70 dark:ring-slate-900/40`}
						>
							{props.preview.kind === "image" ? (
								<img
									alt={props.preview.name}
									src={streamUrl}
									className="h-full w-full rounded-2xl object-cover"
								/>
							) : (
								<MaterialIcon
									name={previewIconName(props.preview)}
									className={`${previewTextColor(props.preview)} !text-3xl ${props.preview.kind === "directory" ? "filled-icon" : ""}`}
								/>
							)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
									<span className="rounded-full border border-sidebar-border bg-panel-wash px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-body-text/80 dark:border-white/10 dark:bg-night-3/92 dark:text-[#d7e4fb]/82">
										{t("preview.preview")}
									</span>
								<span className="text-xs font-medium text-body-text/65 dark:text-[#97A3B7]/78">
									{props.currentMount?.name ??
										props.preview.mountId}
								</span>
							</div>
							<h3
								className={`mt-3 min-w-0 truncate font-bold text-heading-text dark:text-white ${
									immersivePreview
										? "text-2xl"
										: "text-base sm:text-lg"
								}`}
							>
								{props.preview.name}
							</h3>
							<div className="mt-3 flex flex-wrap items-center gap-2">
								{fileMetaItems.map((item) => (
									<span
										className="rounded-full border border-sidebar-border bg-white/82 px-3 py-1.5 text-xs font-medium text-body-text dark:border-white/10 dark:bg-night-3/92 dark:text-[#c7d4eb]/78"
										key={item}
									>
										{item}
									</span>
								))}
							</div>
						</div>
					</div>
					{props.canEdit || props.onClosePreview ? (
						<div className="flex shrink-0 items-center gap-2 self-start rounded-[22px] border border-transparent p-1.5 dark:border-white/10 dark:bg-night-1/72">
							{props.onClosePreview ? (
								<button
										className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] text-slate-400 transition-colors hover:bg-panel-wash hover:text-slate-900 dark:text-[#97A3B7]/78 dark:hover:bg-night-2 dark:hover:text-white"
										onClick={props.onClosePreview}
										title={t("preview.closePreview")}
										type="button"
									>
									<MaterialIcon
										name="close"
										className="text-lg"
									/>
								</button>
							) : null}
						</div>
					) : null}
				</div>
			</div>

			<div className="mt-5 min-h-0 flex-1">
				{renderPreviewContent(
					props.preview,
					streamUrl,
					props.onImagePreview,
				)}
			</div>
		</div>
	);
}

function renderPreviewContent(
	preview: PreviewMeta,
	streamUrl: string,
	onImagePreview?: (url: string) => void,
) {
	if (preview.kind === "image") {
		return (
			<div className="flex h-full min-h-[260px] items-center justify-center overflow-hidden rounded-[12px] border border-sidebar-border bg-white/84 dark:border-white/10 dark:bg-night-1/96">
				<button
					className="group flex h-full w-full items-center justify-center p-4"
					onClick={() => onImagePreview?.(streamUrl)}
					type="button"
				>
					<img
						alt={preview.name}
						src={streamUrl}
						className="max-h-full max-w-full rounded-2xl object-contain transition-transform group-hover:scale-[1.01]"
					/>
				</button>
			</div>
		);
	}
	if (preview.kind === "pdf") {
		return (
			<iframe
				src={streamUrl}
				title={preview.name}
				className="h-full min-h-[320px] w-full rounded-[12px] border border-sidebar-border bg-white dark:border-white/10 dark:bg-night-1/96"
			/>
		);
	}
	if (preview.kind === "video") {
		return (
			<video
				controls
				src={streamUrl}
				className="h-full min-h-[320px] w-full rounded-[12px] border border-sidebar-border bg-black object-contain dark:border-white/10"
			/>
		);
	}
	if (preview.kind === "audio") {
		return (
			<div className="flex h-full min-h-[240px] items-center justify-center rounded-[12px] border border-sidebar-border bg-white/84 p-6 dark:border-white/10 dark:bg-night-1/96">
				<div className="w-full max-w-xl">
					<div className="mb-4 flex items-center justify-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-[8px] bg-panel-wash text-body-text dark:bg-night-3/92 dark:text-[#d7e4fb]/82">
							<MaterialIcon
								name="music_note"
								className="!text-3xl"
							/>
						</div>
					</div>
					<audio controls src={streamUrl} className="w-full" />
				</div>
			</div>
		);
	}
	if (preview.kind === "text") {
		return (
			<pre className="h-full min-h-[320px] overflow-auto rounded-[12px] border border-sidebar-border bg-white/84 p-4 text-sm dark:border-white/10 dark:bg-night-1/96 dark:text-[#d7e4fb]/82">
				{preview.content}
			</pre>
		);
	}
	if (preview.kind === "markdown") {
		return (
			<div className="h-full min-h-[320px] overflow-auto rounded-[12px] border border-sidebar-border bg-white p-5 dark:border-white/10 dark:bg-night-1/96">
				<article
					className="markdown-preview"
					dangerouslySetInnerHTML={{
						__html: renderMarkdown(preview.content ?? ""),
					}}
				/>
			</div>
		);
	}
	return (
		<div className="flex h-full min-h-[260px] items-center justify-center rounded-[12px] border border-dashed border-sidebar-border bg-white/84 p-6 text-center dark:border-white/10 dark:bg-night-1/96">
			<div>
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[8px] bg-panel-wash text-body-text dark:bg-night-3/92 dark:text-[#d7e4fb]/82">
					<MaterialIcon
						name={previewIconName(preview)}
						className="!text-3xl"
					/>
				</div>
				<div className="mt-4 text-base font-bold text-heading-text dark:text-white">
					{translate("preview.noInlinePreviewTitle")}
				</div>
				<p className="mt-2 text-sm text-body-text/75 dark:text-[#97A3B7]/78">
					{translate("preview.noInlinePreviewDescription")}
				</p>
			</div>
		</div>
	);
}

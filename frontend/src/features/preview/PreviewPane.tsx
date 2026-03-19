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
	taskCount: number;
}) {
	const entry = props.activeEntry;

	// Multi-selection
	if (props.selectedEntries.length > 1) {
		return (
			<div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 sm:p-6">
				<div className="mb-6 flex items-center justify-between">
					<h3 className="text-lg font-bold">
						{props.selectedEntries.length} 项已选
					</h3>
					{props.taskCount > 0 ? (
						<button
							className="text-xs text-primary font-medium"
							onClick={props.onShowTasks}
							type="button"
						>
							任务 {props.taskCount}
						</button>
					) : null}
				</div>
				<p className="text-sm text-slate-500 mb-4">
					批量选择时不会自动加载预览。可以直接执行移动、复制、删除或批量下载操作。
				</p>
				<div className="flex flex-wrap gap-2">
					{props.selectedEntries.slice(0, 5).map((item) => (
						<span
							className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700"
							key={`${item.mountId}:${item.path}`}
						>
							{item.name}
						</span>
					))}
					{props.selectedEntries.length > 5 ? (
						<span className="px-3 py-1 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full">
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
					<h3 className="text-lg font-bold">Properties</h3>
				</div>
				<div className="mb-8 flex flex-col items-center gap-4">
					<div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-blue-500/10 sm:h-32 sm:w-32">
						<MaterialIcon
							name="folder"
							className="text-blue-500 !text-6xl filled-icon"
						/>
					</div>
					<h4 className="text-md font-bold text-center">
						{entry.name}
					</h4>
					<p className="text-xs text-slate-500">文件夹</p>
				</div>
				<div className="space-y-4">
					<div className="flex justify-between text-sm">
						<span className="text-slate-500 font-medium">
							Mount:
						</span>
						<span className="font-medium">
							{props.currentMount?.name ?? entry.mountId}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-slate-500 font-medium">
							Location:
						</span>
						<span className="font-medium truncate ml-4">
							{entry.path}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-slate-500 font-medium">
							Modified:
						</span>
						<span className="font-medium">
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
					className="text-slate-300 dark:text-slate-600 !text-6xl mb-4"
				/>
				<h3 className="text-lg font-bold mb-2">
					{props.currentMount?.name ?? "未选择挂载点"}
				</h3>
				<p className="text-sm text-slate-500">
					{props.searchQuery
						? `当前正在搜索 "${props.searchQuery}"`
						: "选择一个项目查看详情"}
				</p>
				{props.taskCount > 0 ? (
					<button
						className="mt-4 text-sm text-primary font-medium hover:underline"
						onClick={props.onShowTasks}
						type="button"
					>
						查看 {props.taskCount} 个任务
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
		`Last modified ${formatDateTime(props.preview.modTime)}`,
		describePreviewKind(props.preview.kind, props.preview.mime),
		formatBytes(props.preview.size),
	];

	return (
		<div className="flex h-full min-h-0 flex-col p-4 sm:p-6">
			<div className="shrink-0 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70">
				<div className="flex items-start gap-4">
					<div
						className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${previewBgColor(props.preview)} group`}
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
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
									<h3 className="min-w-0 truncate text-base font-bold text-slate-900 dark:text-white sm:text-lg">
										{props.preview.name}
									</h3>
									{fileMetaItems.map((item, index) => (
										<span
											className="contents"
											key={`${item}-${index}`}
										>
											<span className="text-slate-300 dark:text-slate-600">
												·
											</span>
											<span className="text-xs text-slate-500 dark:text-slate-400">
												{item}
											</span>
										</span>
									))}
								</div>
							</div>
							{props.canEdit ? (
								<button
									className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
									onClick={props.onEnterEdit}
									type="button"
								>
									Edit File
								</button>
							) : null}
						</div>
					</div>
				</div>
			</div>

			<div className="mt-4 min-h-0 flex-1">
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
			<div className="flex h-full min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70">
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
				className="h-full min-h-[320px] w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
			/>
		);
	}
	if (preview.kind === "video") {
		return (
			<video
				controls
				src={streamUrl}
				className="h-full min-h-[320px] w-full rounded-2xl border border-slate-200 bg-black object-contain dark:border-slate-700"
			/>
		);
	}
	if (preview.kind === "audio") {
		return (
			<div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
				<div className="w-full max-w-xl">
					<div className="mb-4 flex items-center justify-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
							<MaterialIcon name="music_note" className="!text-3xl" />
						</div>
					</div>
					<audio controls src={streamUrl} className="w-full" />
				</div>
			</div>
		);
	}
	if (preview.kind === "text") {
		return (
			<pre className="h-full min-h-[320px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
				{preview.content}
			</pre>
		);
	}
	if (preview.kind === "markdown") {
		return (
			<div className="h-full min-h-[320px] overflow-auto rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60">
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
		<div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/40">
			<div>
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
					<MaterialIcon
						name={previewIconName(preview)}
						className="!text-3xl"
					/>
				</div>
				<div className="mt-4 text-base font-bold text-slate-900 dark:text-white">
					当前文件不支持内嵌预览
				</div>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					可以使用下载、打开或其他文件操作继续处理。
				</p>
			</div>
		</div>
	);
}

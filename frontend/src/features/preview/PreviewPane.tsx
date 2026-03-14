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

	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 sm:p-6">
			<div className="mb-6 flex items-center justify-between">
				<h3 className="text-lg font-bold">Properties</h3>
			</div>

			{/* Preview icon */}
			<div className="mb-8 flex flex-col items-center gap-4">
				<div
					className={`relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl ${previewBgColor(props.preview)} group sm:h-32 sm:w-32`}
				>
					{props.preview.kind === "image" ? (
						<>
							<img
								alt={props.preview.name}
								src={streamUrl}
								className="w-full h-full object-cover rounded-2xl cursor-pointer transition-transform group-hover:scale-105"
								onClick={() => {
									if (props.onImagePreview) {
										props.onImagePreview(streamUrl);
									}
								}}
							/>
							<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-2xl">
								<MaterialIcon
									name="zoom_in"
									className="text-white text-3xl drop-shadow-md"
								/>
							</div>
						</>
					) : (
						<MaterialIcon
							name={previewIconName(props.preview)}
							className={`${previewTextColor(props.preview)} !text-6xl ${props.preview.kind === "directory" ? "filled-icon" : ""}`}
						/>
					)}
				</div>
				<h4 className="text-center text-base font-bold sm:text-lg">
					{props.preview.name}
				</h4>
				<p className="text-xs text-slate-500">
					Last modified {formatDateTime(props.preview.modTime)}
				</p>
			</div>

			{/* Metadata */}
			<div className="mb-8 space-y-4">
				<div className="flex justify-between text-sm">
					<span className="text-slate-500 font-medium">Type:</span>
					<span className="font-medium">
						{describePreviewKind(
							props.preview.kind,
							props.preview.mime,
						)}
					</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-slate-500 font-medium">Size:</span>
					<span className="font-medium">
						{formatBytes(props.preview.size)}
					</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-slate-500 font-medium">
						Location:
					</span>
					<span className="font-medium truncate ml-4">
						{props.preview.path}
					</span>
				</div>
			</div>

			{/* Content preview */}
			{props.preview.kind === "pdf" ? (
				<iframe
					src={streamUrl}
					title={props.preview.name}
					className="mb-4 h-64 w-full rounded-xl border border-slate-200 dark:border-slate-700 sm:h-72"
				/>
			) : null}
			{props.preview.kind === "audio" ? (
				<audio controls src={streamUrl} className="w-full mb-4" />
			) : null}
			{props.preview.kind === "video" ? (
				<video
					controls
					src={streamUrl}
					className="mb-4 w-full rounded-xl border border-slate-200 dark:border-slate-700"
				/>
			) : null}
			{props.preview.kind === "text" ? (
				<pre className="mb-4 max-h-[320px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50 sm:max-h-[360px]">
					{props.preview.content}
				</pre>
			) : null}
			{props.preview.kind === "markdown" ? (
				<article
					className="markdown-preview mb-4"
					dangerouslySetInnerHTML={{
						__html: renderMarkdown(props.preview.content ?? ""),
					}}
				/>
			) : null}

			{/* Actions */}
			<div className="mt-6 space-y-2 sm:mt-auto">
				{props.canEdit ? (
					<button
						className="w-full py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
						onClick={props.onEnterEdit}
						type="button"
					>
						Edit File
					</button>
				) : (
					<a
						className="w-full py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center"
						href={streamUrl}
						rel="noreferrer"
						download={entry?.name}
					>
						Download File
					</a>
				)}
			</div>
		</div>
	);
}

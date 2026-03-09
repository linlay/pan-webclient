import type {
	FileEntry,
	MountRoot,
	PreviewMeta,
} from "../../types/contracts/index";
import { rawFileUrl } from "../../api";
import { renderMarkdown } from "../shared/markdown";
import { MaterialIcon } from "../shared/Icons";
import { useState } from "react";

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
			<div className="flex flex-col p-6">
				<div className="flex items-center justify-between mb-6">
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
			<div className="flex flex-col p-6">
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-lg font-bold">Properties</h3>
				</div>
				<div className="flex flex-col items-center gap-4 mb-8">
					<div className="w-32 h-32 bg-blue-500/10 rounded-2xl flex items-center justify-center">
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
			<div className="flex flex-col items-center justify-center p-6 py-20 text-center">
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
		props.preview.streamUrl ??
		rawFileUrl(props.preview.mountId, props.preview.path);

	return (
		<div className="flex flex-col p-6">
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-bold">Properties</h3>
				<button
					className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
					type="button"
				>
					<MaterialIcon name="close" className="text-sm" />
				</button>
			</div>

			{/* Preview icon */}
			<div className="flex flex-col items-center gap-4 mb-8">
				<div
					className={`w-32 h-32 ${previewBgColor(props.preview)} rounded-2xl flex items-center justify-center relative group overflow-hidden`}
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
				<h4 className="text-md font-bold text-center">
					{props.preview.name}
				</h4>
				<p className="text-xs text-slate-500">
					Last modified {formatDateTime(props.preview.modTime)}
				</p>
			</div>

			{/* Metadata */}
			<div className="space-y-4 mb-8">
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
					className="w-full h-64 rounded-xl border border-slate-200 dark:border-slate-700 mb-4"
				/>
			) : null}
			{props.preview.kind === "audio" ? (
				<audio controls src={streamUrl} className="w-full mb-4" />
			) : null}
			{props.preview.kind === "video" ? (
				<video
					controls
					src={streamUrl}
					className="w-full rounded-xl border border-slate-200 dark:border-slate-700 mb-4"
				/>
			) : null}
			{props.preview.kind === "text" ? (
				<pre className="max-h-[300px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm mb-4">
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
			<div className="mt-auto space-y-2">
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

function previewIconName(preview: PreviewMeta) {
	switch (preview.kind) {
		case "image":
			return "image";
		case "video":
			return "movie";
		case "audio":
			return "music_note";
		case "pdf":
			return "picture_as_pdf";
		case "markdown":
			return "article";
		case "text":
			return "description";
		case "directory":
			return "folder";
		default:
			return "draft";
	}
}

function previewBgColor(preview: PreviewMeta) {
	switch (preview.kind) {
		case "image":
			return "bg-amber-500/10";
		case "video":
			return "bg-slate-500/10";
		case "audio":
			return "bg-zinc-500/10";
		case "pdf":
			return "bg-rose-500/10";
		case "markdown":
			return "bg-slate-400/10";
		case "text":
			return "bg-slate-400/10";
		case "directory":
			return "bg-primary/10";
		default:
			return "bg-slate-100 dark:bg-slate-800";
	}
}

function previewTextColor(preview: PreviewMeta) {
	switch (preview.kind) {
		case "image":
			return "text-amber-500";
		case "video":
			return "text-slate-500";
		case "audio":
			return "text-zinc-500";
		case "pdf":
			return "text-rose-500";
		case "markdown":
			return "text-slate-400";
		case "text":
			return "text-slate-400";
		case "directory":
			return "text-primary";
		default:
			return "text-slate-500";
	}
}

function describePreviewKind(kind: PreviewMeta["kind"], mime: string) {
	switch (kind) {
		case "markdown":
			return "Markdown";
		case "text":
			return "Text File";
		case "download":
			return mime || "File";
		case "image":
			return "Image";
		case "audio":
			return "Audio";
		case "video":
			return "Video";
		case "pdf":
			return "PDF Document";
		default:
			return kind;
	}
}

function formatBytes(value: number) {
	if (value < 1024) return `${value} B`;
	if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
	if (value < 1024 * 1024 * 1024)
		return `${(value / 1024 / 1024).toFixed(1)} MB`;
	return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDateTime(value: number) {
	return new Date(value * 1000).toLocaleString();
}

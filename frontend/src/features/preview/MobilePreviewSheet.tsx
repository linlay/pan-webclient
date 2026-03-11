import React from "react";
import type { PreviewMeta } from "../../types/contracts";
import { MaterialIcon } from "../shared/Icons";
import { rawFileUrl } from "../../api";

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

export interface MobilePreviewSheetProps {
	preview: PreviewMeta;
	isOpen: boolean;
	onClose: () => void;
	onImagePreview?: (url: string) => void;
	onDownload: () => void;
	onRename: () => void;
	onMove: () => void;
	onCopy: () => void;
	onDelete: () => void;
}

export function MobilePreviewSheet(props: MobilePreviewSheetProps) {
	if (!props.isOpen) return null;

	const { preview } = props;
	const streamUrl =
		preview.streamUrl ?? rawFileUrl(preview.mountId, preview.path);
	const iconInfo = {
		icon: previewIconName(preview),
		color: previewBgColor(preview),
		textColor: previewTextColor(preview),
	};

	return (
		<>
			<div
				className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
				onClick={props.onClose}
			/>
			<div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-bg-dark rounded-t-3xl shadow-2xl transform transition-transform duration-300 translate-y-0">
				{/* Handle */}
				<div
					className="flex justify-center pt-3 pb-2"
					onClick={props.onClose}
				>
					<div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
				</div>

				<div className="px-6 pb-8 pt-2">
					{/* Header: Visual + Basic Info */}
					<div className="flex items-center gap-4 mb-6">
						<div
							className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden ${iconInfo.color}`}
						>
							{preview.kind === "image" ? (
								<img
									alt={preview.name}
									src={streamUrl}
									className="w-full h-full object-cover"
									onClick={() =>
										props.onImagePreview?.(streamUrl)
									}
								/>
							) : (
								<span
									className={`material-symbols-outlined text-3xl ${iconInfo.textColor} ${
										preview.kind === "directory"
											? "filled-icon"
											: ""
									}`}
								>
									{iconInfo.icon}
								</span>
							)}
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
								{preview.name}
							</h3>
							<p className="text-sm text-slate-500 mt-0.5 truncate">
								{formatDateTime(preview.modTime)}
							</p>
							<p className="text-xs text-slate-400 mt-0.5">
								{describePreviewKind(
									preview.kind,
									preview.size ? preview.size.toString() : "",
								)}
								{preview.kind !== "directory" &&
									preview.size !== undefined && (
										<span>
											{" "}
											• {formatBytes(preview.size)}
										</span>
									)}
							</p>
						</div>
					</div>

					{/* Actions Grid */}
					<div className="grid grid-cols-5 gap-2">
						<button
							className="flex flex-col items-center gap-1.5 p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							onClick={() => {
								props.onDownload();
								props.onClose();
							}}
						>
							<div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
								<MaterialIcon
									name="download"
									className="text-[20px]"
								/>
							</div>
							<span className="text-[10px] font-medium">
								Download
							</span>
						</button>

						<button
							className="flex flex-col items-center gap-1.5 p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							onClick={() => {
								props.onRename();
								props.onClose();
							}}
						>
							<div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
								<MaterialIcon
									name="edit"
									className="text-[20px]"
								/>
							</div>
							<span className="text-[10px] font-medium">
								Rename
							</span>
						</button>

						<button
							className="flex flex-col items-center gap-1.5 p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							onClick={() => {
								props.onMove();
								props.onClose();
							}}
						>
							<div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
								<MaterialIcon
									name="drive_file_move"
									className="text-[20px]"
								/>
							</div>
							<span className="text-[10px] font-medium">
								Move
							</span>
						</button>

						<button
							className="flex flex-col items-center gap-1.5 p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							onClick={() => {
								props.onCopy();
								props.onClose();
							}}
						>
							<div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
								<MaterialIcon
									name="content_copy"
									className="text-[20px]"
								/>
							</div>
							<span className="text-[10px] font-medium">
								Copy
							</span>
						</button>

						<button
							className="flex flex-col items-center gap-1.5 p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
							onClick={() => {
								props.onDelete();
								props.onClose();
							}}
						>
							<div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/20 flex items-center justify-center">
								<MaterialIcon
									name="delete"
									className="text-[20px]"
								/>
							</div>
							<span className="text-[10px] font-medium">
								Delete
							</span>
						</button>
					</div>
				</div>
			</div>
		</>
	);
}

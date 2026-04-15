import React from "react";
import type { PreviewMeta } from "../../types/contracts";
import { MaterialIcon } from "../shared/Icons";
import { rawFileUrl } from "../../api";
import { resolveExternalUrl } from "../../api/routing";
import {
	describePreviewKind,
	formatBytes,
	formatDateTime,
	previewBgColor,
	previewIconName,
	previewTextColor,
} from "@/utils";
import { useTranslation } from "react-i18next";

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
	const { t } = useTranslation();
	if (!props.isOpen) return null;

	const { preview } = props;
	const streamUrl =
		(preview.streamUrl
			? resolveExternalUrl(preview.streamUrl)
			: null) ?? rawFileUrl(preview.mountId, preview.path);
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
			<div className="fixed inset-x-0 bottom-0 z-50 translate-y-0 rounded-t-3xl border border-b-0 border-sidebar-border bg-white transition-transform duration-300 dark:border-white/10 dark:bg-night-0/98">
				{/* Handle */}
				<div
					className="flex justify-center pt-3 pb-2"
					onClick={props.onClose}
				>
					<div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-white/12" />
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
								<MaterialIcon
									className={`text-3xl ${iconInfo.textColor}`}
									name={iconInfo.icon}
								/>
							)}
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
								{preview.name}
							</h3>
							<p className="mt-0.5 truncate text-sm text-slate-500 dark:text-[#97A3B7]/78">
								{formatDateTime(preview.modTime)}
							</p>
							<p className="mt-0.5 text-xs text-slate-400 dark:text-[#8FA7CF]/70">
								{describePreviewKind(
									preview.kind,
									preview.mime,
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
							className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2"
							onClick={() => {
								props.onDownload();
								props.onClose();
							}}
						>
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-night-2">
								<MaterialIcon
									name="download"
									className="text-[20px]"
								/>
							</div>
							<span className="text-[10px] font-medium">
								{t("common.download")}
							</span>
						</button>

						<button
							className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2"
							onClick={() => {
								props.onRename();
								props.onClose();
							}}
						>
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-night-2">
								<MaterialIcon
									name="edit"
									className="text-[20px]"
								/>
							</div>
							<span className="text-[10px] font-medium">
								{t("common.rename")}
							</span>
						</button>

						<button
							className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2"
							onClick={() => {
								props.onMove();
								props.onClose();
							}}
						>
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-night-2">
								<MaterialIcon
									name="drive_file_move"
									className="text-[20px]"
								/>
							</div>
							<span className="text-[10px] font-medium">
								{t("common.move")}
							</span>
						</button>

						<button
							className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2"
							onClick={() => {
								props.onCopy();
								props.onClose();
							}}
						>
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-night-2">
								<MaterialIcon
									name="content_copy"
									className="text-[20px]"
								/>
							</div>
							<span className="text-[10px] font-medium">
								{t("common.copy")}
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
								{t("common.delete")}
							</span>
						</button>
					</div>
				</div>
			</div>
		</>
	);
}

import {
	MaterialIcon,
	IconEdit,
	IconMove,
	IconCopy,
	IconTrash,
} from "@/features/shared/Icons";
import { useTranslation } from "react-i18next";

export interface AppToolbarProps {
	canShareCurrentFolder: boolean;
	foldersCount: number;
	filesCount: number;
	hasSelection: boolean;
	isSingleSelection: boolean;
	onBatchDownload: () => void;
	onCreateFolder: () => void;
	onDelete: () => void;
	onMoveCopy: (kind: "move" | "copy") => void;
	onRename: () => void;
	onRefresh: () => void;
	onShareCurrentFolder: () => void;
	onShare: () => void;
	onUploadClick: () => void;
	isMobile: boolean;
}

export function AppToolbar(props: AppToolbarProps) {
	const { t } = useTranslation();

	if (props.isMobile && !props.hasSelection) {
		return null;
	}

	return (
		<div
			className={`border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 ${
				props.isMobile
					? "mb-4 rounded-2xl p-1.5"
					: "mb-6 rounded-xl p-2"
			} flex flex-wrap items-center justify-between gap-3`}
		>
			<div
				className={`flex flex-wrap items-center ${
					props.isMobile ? "gap-1.5" : "gap-2"
				}`}
			>
				{!props.isMobile && (
					<>
						<button
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-sm"
							onClick={props.onCreateFolder}
							type="button"
						>
							<MaterialIcon name="add" className="text-sm" />{" "}
							{t("toolbar.newFolder")}
						</button>
						<button
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm"
							onClick={props.onUploadClick}
							type="button"
						>
							<MaterialIcon name="upload" className="text-sm" />{" "}
							{t("common.upload")}
						</button>
						<button
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm"
							onClick={props.onRefresh}
							type="button"
						>
							<MaterialIcon name="refresh" className="text-sm" />{" "}
							{t("common.refresh")}
						</button>
						{props.canShareCurrentFolder ? (
							<button
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm"
								onClick={props.onShareCurrentFolder}
								type="button"
							>
									<MaterialIcon
										name="folder"
										className="text-sm filled-icon"
									/>{" "}
									{t("toolbar.shareFolder")}
								</button>
							) : null}
					</>
				)}

				{props.hasSelection ? (
					<>
						<div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-1 hidden sm:block" />
						<button
							className={
								props.isMobile
									? "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
									: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
							}
							onClick={props.onBatchDownload}
							type="button"
						>
								<MaterialIcon
									name="download"
									className={props.isMobile ? "text-[13px]" : "text-sm"}
								/>{" "}
								{t("common.download")}
							</button>
						{props.isSingleSelection ? (
							<button
								className={
									props.isMobile
										? "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
										: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
								}
								onClick={props.onShare}
								type="button"
							>
								<MaterialIcon
									name="open_in_new"
									className={props.isMobile ? "text-[13px]" : "text-sm"}
								/>{" "}
								{t("common.share")}
							</button>
						) : null}
						{props.isSingleSelection ? (
							<button
								className={
									props.isMobile
										? "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
										: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
								}
								onClick={props.onRename}
								type="button"
							>
								<IconEdit size={props.isMobile ? 12 : 14} />{" "}
								{t("common.rename")}
							</button>
						) : null}
						<button
							className={
								props.isMobile
									? "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
									: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
							}
							onClick={() => props.onMoveCopy("move")}
							type="button"
						>
							<IconMove size={props.isMobile ? 12 : 14} />{" "}
							{t("common.move")}
						</button>
						<button
							className={
								props.isMobile
									? "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
									: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
							}
							onClick={() => props.onMoveCopy("copy")}
							type="button"
						>
							<IconCopy size={props.isMobile ? 12 : 14} />{" "}
							{t("common.copy")}
						</button>
						<button
							className={
								props.isMobile
									? "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
									: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
							}
							onClick={props.onDelete}
							type="button"
						>
							<IconTrash size={props.isMobile ? 12 : 14} />{" "}
							{t("common.delete")}
						</button>
					</>
				) : null}
			</div>
			<div
				className={
					props.isMobile
						? "hidden"
						: "flex flex-shrink-0 items-center gap-2 px-2 text-xs font-medium text-slate-400 sm:px-4"
				}
				>
					<span>
						{props.foldersCount} {t("common.folders")},{" "}
						{props.filesCount} {t("common.files")}
					</span>
				</div>
		</div>
	);
}

import {
	MaterialIcon,
	IconEdit,
	IconMove,
	IconCopy,
	IconTrash,
} from "@/features/shared/Icons";

export interface AppToolbarProps {
	foldersCount: number;
	filesCount: number;
	hasSelection: boolean;
	isSingleSelection: boolean;
	onBatchDownload: () => void;
	onCreateFolder: () => void;
	onDelete: () => void;
	onMoveCopy: (kind: "move" | "copy") => void;
	onRename: () => void;
	onUploadClick: () => void;
}

export function AppToolbar(props: AppToolbarProps) {
	return (
		<div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl flex flex-wrap gap-3 items-center justify-between border border-slate-200 dark:border-slate-700">
			<div className="flex flex-wrap items-center gap-2">
				<button
					className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-sm"
					onClick={props.onCreateFolder}
					type="button"
				>
					<MaterialIcon name="add" className="text-sm" /> New Folder
				</button>
				<button
					className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm"
					onClick={props.onUploadClick}
					type="button"
				>
					<MaterialIcon name="upload" className="text-sm" /> Upload
				</button>

				{props.hasSelection ? (
					<>
						<div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-1 hidden sm:block" />
						<button
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
							onClick={props.onBatchDownload}
							type="button"
						>
							<MaterialIcon name="download" className="text-sm" />{" "}
							Download
						</button>
						{props.isSingleSelection ? (
							<button
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
								onClick={props.onRename}
								type="button"
							>
								<IconEdit size={14} /> Rename
							</button>
						) : null}
						<button
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
							onClick={() => props.onMoveCopy("move")}
							type="button"
						>
							<IconMove size={14} /> Move
						</button>
						<button
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
							onClick={() => props.onMoveCopy("copy")}
							type="button"
						>
							<IconCopy size={14} /> Copy
						</button>
						<button
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
							onClick={props.onDelete}
							type="button"
						>
							<IconTrash size={14} /> Delete
						</button>
					</>
				) : null}
			</div>
			<div className="flex flex-shrink-0 items-center gap-2 text-slate-400 text-xs font-medium px-2 sm:px-4">
				<span>
					{props.foldersCount} folders, {props.filesCount} files
				</span>
			</div>
		</div>
	);
}

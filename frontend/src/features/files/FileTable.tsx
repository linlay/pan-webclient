import type { FileEntry } from "../../types/contracts/index";
import {
	IconCopy,
	IconDownload,
	IconEdit,
	IconMove,
	IconTrash,
	MaterialIcon,
} from "../shared/Icons";
import { MenuButton } from "../shared/MenuButton";

export function FileTable(props: {
	entries: FileEntry[];
	selectedEntries: FileEntry[];
	showPath: boolean;
	viewMode: "grid" | "list";
	onActivate: (entry: FileEntry) => void;
	onToggleSelection: (entry: FileEntry) => void;
	onRename: (entry: FileEntry) => void;
	onMove: (entry: FileEntry) => void;
	onCopy: (entry: FileEntry) => void;
	onDelete: (entry: FileEntry) => void;
	onDownload: (entry: FileEntry) => void;
	onToggleAllSelection?: (selectAll: boolean) => void;
}) {
	if (props.entries.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<MaterialIcon
					name="folder_open"
					className="text-slate-300 dark:text-slate-600 !text-6xl mb-4"
				/>
				<strong className="text-slate-500 dark:text-slate-400 text-lg">
					当前没有可展示的项目
				</strong>
				<p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
					可以切换目录、清空搜索条件，或直接上传文件。
				</p>
			</div>
		);
	}

	if (props.viewMode === "grid") {
		return <GridView {...props} />;
	}

	return <ListView {...props} />;
}

// ─── Grid View (based on pc_explorer_view prototype) ───
function GridView(props: {
	entries: FileEntry[];
	selectedEntries: FileEntry[];
	onActivate: (entry: FileEntry) => void;
	onToggleSelection: (entry: FileEntry) => void;
}) {
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
			{props.entries.map((entry) => {
				const selected = isSelected(entry, props.selectedEntries);
				const { icon, color } = getFileVisual(entry);
				return (
					<div
						className={`group flex flex-col items-center gap-2 cursor-pointer ${
							selected ? "opacity-80" : ""
						}`}
						key={`${entry.mountId}:${entry.path}`}
						onClick={() => props.onActivate(entry)}
						onKeyDown={(e) => {
							if (e.key === "Enter") props.onActivate(entry);
							if (e.key === " ") {
								e.preventDefault();
								props.onToggleSelection(entry);
							}
						}}
						role="button"
						tabIndex={0}
					>
						<div
							className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 ${color} ${
								selected
									? "ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900"
									: ""
							}`}
						>
							<span
								className={`material-symbols-outlined text-5xl ${entry.isDir ? "filled-icon" : ""}`}
							>
								{icon}
							</span>
						</div>
						<span className="text-xs font-medium text-center truncate w-full px-1">
							{entry.name}
						</span>
					</div>
				);
			})}
		</div>
	);
}

// ─── List View (based on professional_remote_file_manager_pc prototype) ───
function ListView(props: {
	entries: FileEntry[];
	selectedEntries: FileEntry[];
	showPath: boolean;
	onActivate: (entry: FileEntry) => void;
	onToggleSelection: (entry: FileEntry) => void;
	onRename: (entry: FileEntry) => void;
	onMove: (entry: FileEntry) => void;
	onCopy: (entry: FileEntry) => void;
	onDelete: (entry: FileEntry) => void;
	onDownload: (entry: FileEntry) => void;
	onToggleAllSelection?: (selectAll: boolean) => void;
}) {
	const allSelected =
		props.entries.length > 0 &&
		props.entries.every((entry) =>
			isSelected(entry, props.selectedEntries),
		);

	return (
		<div className="rounded-xl border border-slate-200 dark:border-slate-800">
			<table className="w-full text-left text-sm border-collapse">
				<thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
					<tr className="border-b border-slate-200 dark:border-slate-800">
						<th className="px-4 py-3 w-10 text-center">
							<div className="flex items-center justify-center">
								<input
									type="checkbox"
									className="rounded border-slate-300 text-primary focus:ring-primary"
									checked={allSelected}
									onChange={(e) => {
										if (props.onToggleAllSelection) {
											props.onToggleAllSelection(
												e.target.checked,
											);
										}
									}}
								/>
							</div>
						</th>
						<th className="px-4 py-3">Name</th>
						<th className="px-4 py-3">Date Modified</th>
						<th className="px-4 py-3">Type</th>
						<th className="px-4 py-3 text-right">Size</th>
						<th className="px-4 py-3 w-10"></th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
					{props.entries.map((entry) => {
						const selected = isSelected(
							entry,
							props.selectedEntries,
						);
						const { icon, textColor } = getFileVisual(entry);
						return (
							<tr
								className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
									selected ? "bg-primary/5" : ""
								}`}
								key={`${entry.mountId}:${entry.path}`}
								onClick={() => props.onActivate(entry)}
								onKeyDown={(e) => {
									if (e.key === "Enter")
										props.onActivate(entry);
									if (e.key === " ") {
										e.preventDefault();
										props.onToggleSelection(entry);
									}
								}}
								tabIndex={0}
							>
								<td className="px-4 py-3 text-center">
									<input
										className="rounded border-slate-300 text-primary focus:ring-primary"
										type="checkbox"
										checked={selected}
										onChange={(e) => {
											e.stopPropagation();
											props.onToggleSelection(entry);
										}}
										onClick={(e) => e.stopPropagation()}
									/>
								</td>
								<td className="px-4 py-3">
									<div className="flex items-center gap-3 font-medium text-slate-900 dark:text-slate-100">
										<span
											className={`material-symbols-outlined ${textColor} ${entry.isDir ? "filled-icon" : ""} text-xl`}
										>
											{icon}
										</span>
										<div className="min-w-0">
											<span className="block truncate">
												{entry.name}
											</span>
											{props.showPath ? (
												<span className="block text-xs text-slate-400 truncate">
													{entry.path}
												</span>
											) : null}
										</div>
									</div>
								</td>
								<td className="px-4 py-3 text-slate-500">
									{formatDateTime(entry.modTime)}
								</td>
								<td className="px-4 py-3 text-slate-500">
									{describeType(entry)}
								</td>
								<td className="px-4 py-3 text-right text-slate-500">
									{entry.isDir
										? "--"
										: formatBytes(entry.size)}
								</td>
								<td
									className="px-4 py-3"
									onClick={(e) => e.stopPropagation()}
								>
									<MenuButton
										actions={[
											{
												label: "重命名",
												icon: <IconEdit size={14} />,
												onSelect: () =>
													props.onRename(entry),
											},
											{
												label: "移动",
												icon: <IconMove size={14} />,
												onSelect: () =>
													props.onMove(entry),
											},
											{
												label: "复制",
												icon: <IconCopy size={14} />,
												onSelect: () =>
													props.onCopy(entry),
											},
											{
												label: "下载",
												icon: (
													<IconDownload size={14} />
												),
												onSelect: () =>
													props.onDownload(entry),
											},
											{
												label: "删除",
												icon: <IconTrash size={14} />,
												danger: true,
												onSelect: () =>
													props.onDelete(entry),
											},
										]}
										buttonClassName="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
										buttonContent={
											<MaterialIcon
												name="more_vert"
												className="text-lg"
											/>
										}
										buttonLabel={`${entry.name} 操作`}
										align="right"
									/>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// ─── Helpers ───
function isSelected(entry: FileEntry, selectedEntries: FileEntry[]) {
	return selectedEntries.some(
		(item) => item.mountId === entry.mountId && item.path === entry.path,
	);
}

function getFileVisual(entry: FileEntry) {
	if (entry.isDir) {
		return {
			icon: "folder",
			color: "bg-primary/10 dark:bg-primary/20",
			textColor: "text-primary",
		};
	}
	if (entry.mime.startsWith("image/")) {
		return {
			icon: "image",
			color: "bg-amber-500/10 dark:bg-amber-500/20",
			textColor: "text-amber-500",
		};
	}
	if (entry.mime.startsWith("video/")) {
		return {
			icon: "movie",
			color: "bg-slate-500/10 dark:bg-slate-500/20",
			textColor: "text-slate-500",
		};
	}
	if (entry.mime.startsWith("audio/")) {
		return {
			icon: "music_note",
			color: "bg-zinc-500/10 dark:bg-zinc-500/20",
			textColor: "text-zinc-500",
		};
	}
	if (entry.mime === "application/pdf") {
		return {
			icon: "picture_as_pdf",
			color: "bg-rose-500/10 dark:bg-rose-500/20",
			textColor: "text-rose-500",
		};
	}
	if (entry.mime.startsWith("text/")) {
		return {
			icon: "description",
			color: "bg-slate-400/10 dark:bg-slate-400/20",
			textColor: "text-slate-400",
		};
	}
	return {
		icon: "draft",
		color: "bg-slate-100 dark:bg-slate-800",
		textColor: "text-slate-500",
	};
}

function describeType(entry: FileEntry) {
	if (entry.isDir) return "Folder";
	if (entry.mime === "application/pdf") return "PDF Document";
	if (entry.mime.startsWith("image/")) return "Image";
	if (entry.mime.startsWith("video/")) return "Video";
	if (entry.mime.startsWith("audio/")) return "Audio";
	if (entry.mime.startsWith("text/")) return "Text File";
	return entry.extension
		? entry.extension.toUpperCase().replace(".", "") + " File"
		: "File";
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

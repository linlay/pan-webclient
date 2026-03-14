import { useEffect, useRef } from "react";
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
import {
	describeEntryType,
	entryKey,
	formatBytes,
	formatCompactDate,
	formatDateTime,
	getFileVisual,
	isEntrySelected,
} from "@/utils";

export function FileTable(props: {
	isMobile?: boolean;
	entries: FileEntry[];
	selectionMode?: boolean;
	selectedEntries: FileEntry[];
	showPath: boolean;
	viewMode: "grid" | "list";
	onActivate: (entry: FileEntry) => void;
	onSelectionModeChange?: (next: boolean) => void;
	onSetSelection?: (entries: FileEntry[]) => void;
	onToggleSelection: (entry: FileEntry) => void;
	onRename: (entry: FileEntry) => void;
	onMove: (entry: FileEntry) => void;
	onCopy: (entry: FileEntry) => void;
	onDelete: (entry: FileEntry) => void;
	onDownload: (entry: FileEntry) => void;
	onShare: (entry: FileEntry) => void;
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

const MOBILE_LONG_PRESS_MS = 380;

type ListViewProps = {
	isMobile?: boolean;
	entries: FileEntry[];
	selectionMode?: boolean;
	selectedEntries: FileEntry[];
	showPath: boolean;
	onActivate: (entry: FileEntry) => void;
	onSelectionModeChange?: (next: boolean) => void;
	onSetSelection?: (entries: FileEntry[]) => void;
	onToggleSelection: (entry: FileEntry) => void;
	onRename: (entry: FileEntry) => void;
	onMove: (entry: FileEntry) => void;
	onCopy: (entry: FileEntry) => void;
	onDelete: (entry: FileEntry) => void;
	onDownload: (entry: FileEntry) => void;
	onShare: (entry: FileEntry) => void;
	onToggleAllSelection?: (selectAll: boolean) => void;
};

// ─── Grid View (based on pc_explorer_view prototype) ───
function GridView(props: {
	isMobile?: boolean;
	entries: FileEntry[];
	selectedEntries: FileEntry[];
	onActivate: (entry: FileEntry) => void;
	onToggleSelection: (entry: FileEntry) => void;
	onShare?: (entry: FileEntry) => void;
}) {
	return (
		<div className="grid grid-cols-[repeat(auto-fill,minmax(142px,1fr))] gap-x-3.5 gap-y-4.5 md:grid-cols-[repeat(auto-fill,minmax(148px,1fr))] md:gap-x-4 md:gap-y-5 xl:grid-cols-[repeat(auto-fill,minmax(156px,1fr))]">
			{props.entries.map((entry) => {
				const selected = isEntrySelected(entry, props.selectedEntries);
				const { icon, color, textColor } = getFileVisual(entry);
				return (
					<div
						className="group cursor-pointer"
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
							className={`relative rounded-[24px] p-2 transition-all duration-200 ${
								selected
									? "bg-primary/6"
									: "hover:-translate-y-1 hover:bg-slate-50/90 dark:hover:bg-slate-800/35"
							}`}
						>
							{selected ? (
								<div className="absolute right-3 top-3 z-10 rounded-full bg-white/95 p-1 text-primary shadow-sm dark:bg-slate-900/95">
									<MaterialIcon
										name="check_circle"
										className="text-base"
									/>
								</div>
							) : null}
							<div
								className={`relative flex aspect-[1/0.82] items-center justify-center overflow-hidden rounded-[20px] border border-white/90 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900 ${
									selected ? "ring-2 ring-primary/15" : ""
								}`}
							>
								<div
									className={`absolute inset-0 opacity-95 ${color}`}
								/>
								<MaterialIcon
									className={`relative text-[3.6rem] transition-transform duration-200 group-hover:scale-110 ${textColor} font-normal`}
									name={icon}
								/>
							</div>

							<div className="mt-2.5 min-w-0 px-0.5">
								<div className="truncate text-[14px] font-semibold leading-5 text-slate-900 dark:text-slate-100">
									{entry.name}
								</div>
								<div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
									<span className="truncate">
										{entry.isDir
											? "目录"
											: formatBytes(entry.size)}
									</span>
									<span className="shrink-0">·</span>
									<span className="shrink-0">
										{formatCompactDate(entry.modTime)}
									</span>
								</div>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

// ─── List View (based on professional_remote_file_manager_pc prototype) ───
function ListView(props: ListViewProps) {
	if (props.isMobile) {
		return <MobileListView {...props} />;
	}

	const allSelected =
		props.entries.length > 0 &&
		props.entries.every((entry) =>
			isEntrySelected(entry, props.selectedEntries),
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
						<th className="px-4 py-3 hidden md:table-cell">
							Date Modified
						</th>
						<th className="px-4 py-3 hidden lg:table-cell">Type</th>
						<th className="px-4 py-3 text-right hidden sm:table-cell">
							Size
						</th>
						<th className="px-4 py-3 w-10"></th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
					{props.entries.map((entry) => {
						const selected = isEntrySelected(
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
										<MaterialIcon
											className={`${textColor} text-xl`}
											name={icon}
										/>
										<div className="min-w-0 flex-1">
											<span className="block truncate">
												{entry.name}
											</span>
											{/* Mobile specific merged details row */}
											<div className="md:hidden flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-normal">
												<span>
													{formatDateTime(
														entry.modTime,
													)}
												</span>
												<span>·</span>
												<span>
													{entry.isDir
														? "--"
														: formatBytes(
																entry.size,
															)}
												</span>
											</div>
											{props.showPath ? (
												<span className="block text-xs text-slate-400 truncate mt-0.5">
													{entry.path}
												</span>
											) : null}
										</div>
									</div>
								</td>
								<td className="px-4 py-3 text-slate-500 hidden md:table-cell">
									{formatDateTime(entry.modTime)}
								</td>
								<td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
									{describeEntryType(entry)}
								</td>
								<td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">
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
												label: "Rename",
												icon: <IconEdit size={14} />,
												onSelect: () =>
													props.onRename(entry),
											},
											{
												label: "Move",
												icon: <IconMove size={14} />,
												onSelect: () =>
													props.onMove(entry),
											},
											{
												label: "Copy",
												icon: <IconCopy size={14} />,
												onSelect: () =>
													props.onCopy(entry),
											},
											{
												label: "Share",
												icon: (
													<MaterialIcon
														name="open_in_new"
														className="text-sm"
													/>
												),
												onSelect: () =>
													props.onShare(entry),
											},
											{
												label: "Download",
												icon: (
													<IconDownload size={14} />
												),
												onSelect: () =>
													props.onDownload(entry),
											},
											{
												label: "Delete",
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

function MobileListView(props: ListViewProps) {
	const longPressTimerRef = useRef<number | null>(null);
	const suppressActivateKeyRef = useRef<string | null>(null);
	const selectionMode = Boolean(props.selectionMode);

	useEffect(
		() => () => {
			if (longPressTimerRef.current !== null) {
				window.clearTimeout(longPressTimerRef.current);
			}
		},
		[],
	);

	function clearLongPressTimer() {
		if (longPressTimerRef.current !== null) {
			window.clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}
	}

	function setSelectionModeEnabled(next: boolean) {
		props.onSetSelection?.([]);
		if (!next) {
			props.onSelectionModeChange?.(false);
			return;
		}
		props.onSelectionModeChange?.(true);
	}

	function startLongPress(entry: FileEntry) {
		if (selectionMode) return;
		clearLongPressTimer();
		longPressTimerRef.current = window.setTimeout(() => {
			const key = entryKey(entry);
			suppressActivateKeyRef.current = key;
			props.onSelectionModeChange?.(true);
			props.onSetSelection?.([entry]);
			longPressTimerRef.current = null;
		}, MOBILE_LONG_PRESS_MS);
	}

	function handleActivate(entry: FileEntry) {
		const key = entryKey(entry);
		if (suppressActivateKeyRef.current === key) {
			suppressActivateKeyRef.current = null;
			return;
		}
		props.onActivate(entry);
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between px-1">
				<span className="text-xs font-medium text-slate-400">
					{selectionMode && props.selectedEntries.length > 0
						? `已选 ${props.selectedEntries.length} 项`
						: `${props.entries.length} 项`}
				</span>
				<button
					className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
						selectionMode
							? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
							: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
					}`}
					onClick={() => setSelectionModeEnabled(!selectionMode)}
					type="button"
				>
					{selectionMode ? "完成" : "选择"}
				</button>
			</div>
			<div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
				{props.entries.map((entry, index) => {
					const selected = isEntrySelected(entry, props.selectedEntries);
					const { icon, textColor } = getFileVisual(entry);

					return (
						<div
							className={`flex items-center gap-3 px-4 py-3 transition-colors ${
								selectionMode && selected ? "bg-primary/5" : ""
							} ${index > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""}`}
							key={entryKey(entry)}
							onClick={() => handleActivate(entry)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleActivate(entry);
							}}
							onTouchCancel={clearLongPressTimer}
							onTouchEnd={clearLongPressTimer}
							onTouchMove={clearLongPressTimer}
							onTouchStart={() => startLongPress(entry)}
							role="button"
							tabIndex={0}
						>
							{selectionMode ? (
								<div
									className="flex items-center self-stretch"
									onClick={(e) => e.stopPropagation()}
								>
									<input
										checked={selected}
										className="rounded border-slate-300 text-primary focus:ring-primary"
										onChange={() =>
											props.onToggleSelection(entry)
										}
										onClick={(e) => e.stopPropagation()}
										type="checkbox"
									/>
								</div>
							) : null}
							<div className="flex min-w-0 flex-1 items-center gap-3">
								<MaterialIcon
									className={`text-xl ${textColor}`}
									name={icon}
								/>
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
										{entry.name}
									</div>
									<div className="mt-0.5 flex items-center gap-2 text-[11px] font-normal text-slate-400">
										<span>
											{formatDateTime(entry.modTime)}
										</span>
										<span>·</span>
										<span>
											{entry.isDir
												? "--"
												: formatBytes(entry.size)}
										</span>
									</div>
									{props.showPath ? (
										<div className="mt-0.5 truncate text-[11px] text-slate-400">
											{entry.path}
										</div>
									) : null}
								</div>
							</div>
							<div onClick={(e) => e.stopPropagation()}>
								<MenuButton
									actions={[
										{
											label: "Rename",
											icon: <IconEdit size={14} />,
											onSelect: () =>
												props.onRename(entry),
										},
										{
											label: "Move",
											icon: <IconMove size={14} />,
											onSelect: () => props.onMove(entry),
										},
										{
											label: "Copy",
											icon: <IconCopy size={14} />,
											onSelect: () => props.onCopy(entry),
										},
										{
											label: "Share",
											icon: (
												<MaterialIcon
													name="open_in_new"
													className="text-sm"
												/>
											),
											onSelect: () =>
												props.onShare(entry),
										},
										{
											label: "Download",
											icon: <IconDownload size={14} />,
											onSelect: () =>
												props.onDownload(entry),
										},
										{
											label: "Delete",
											icon: <IconTrash size={14} />,
											danger: true,
											onSelect: () =>
												props.onDelete(entry),
										},
									]}
									align="right"
									buttonClassName="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
									buttonContent={
										<MaterialIcon
											name="more_vert"
											className="text-lg"
										/>
									}
									buttonLabel={`${entry.name} 操作`}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

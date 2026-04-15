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
import { useTranslation } from "react-i18next";

type SelectionChangeOptions = {
	inspectSingle?: boolean;
	revealOnMobile?: boolean;
};

export function FileTable(props: {
	isMobile?: boolean;
	entries: FileEntry[];
	selectionMode?: boolean;
	selectedEntries: FileEntry[];
	showPath: boolean;
	viewMode: "grid" | "list";
	onActivate: (entry: FileEntry) => void;
	onSelectionModeChange?: (next: boolean) => void;
	onSetSelection?: (
		entries: FileEntry[],
		options?: SelectionChangeOptions,
	) => void;
	onToggleSelection: (
		entry: FileEntry,
		options?: SelectionChangeOptions,
	) => void;
	onRename: (entry: FileEntry) => void;
	onMove: (entry: FileEntry) => void;
	onCopy: (entry: FileEntry) => void;
	onDelete: (entry: FileEntry) => void;
	onDownload: (entry: FileEntry) => void;
	onShare: (entry: FileEntry) => void;
	onToggleAllSelection?: (selectAll: boolean) => void;
}) {
	const { t } = useTranslation();
	if (props.entries.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<MaterialIcon
					name="folder_open"
					className="text-primary/25 dark:text-[#3E78FF]/28 !text-6xl mb-4"
				/>
				<strong className="text-heading-text dark:text-[#f4f8ff]/92 text-lg">
					{t("files.emptyTitle")}
				</strong>
				<p className="text-body-text/70 dark:text-[#97A3B7]/78 text-sm mt-2">
					{t("files.emptyDescription")}
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
	onSetSelection?: (
		entries: FileEntry[],
		options?: SelectionChangeOptions,
	) => void;
	onToggleSelection: (
		entry: FileEntry,
		options?: SelectionChangeOptions,
	) => void;
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
	onToggleSelection: (
		entry: FileEntry,
		options?: SelectionChangeOptions,
	) => void;
	onShare?: (entry: FileEntry) => void;
}) {
	const { t } = useTranslation();
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
								props.onToggleSelection(entry, {
									inspectSingle: false,
								});
							}
						}}
						role="button"
						tabIndex={0}
					>
						<div
							className={`relative rounded-[14px] p-2 transition-all duration-200 ${
								selected
									? "bg-primary/6"
									: "hover:bg-white/78 dark:hover:bg-night-3/44"
							}`}
						>
							{selected ? (
								<div className="absolute right-3 top-3 z-10 rounded-full border border-primary/10 bg-white/95 p-1 text-primary dark:border-dark-primary/20 dark:bg-night-2/96 dark:text-[#78A9FF]">
									<MaterialIcon
										name="check_circle"
										className="text-base"
									/>
								</div>
							) : null}
							<div
								className={`relative flex aspect-[1/0.82] items-center justify-center overflow-hidden rounded-[12px] border border-sidebar-border bg-white dark:border-white/10 dark:bg-night-2 ${
									selected ? "ring-1 ring-primary/15" : ""
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
								<div className="truncate text-[14px] font-semibold leading-5 text-heading-text dark:text-[#f4f8ff]/92">
									{entry.name}
								</div>
								<div className="mt-1 flex items-center gap-1.5 text-xs text-body-text/65 dark:text-[#97A3B7]/78">
									<span className="truncate">
										{entry.isDir
											? t("files.directory")
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
	const { t } = useTranslation();
	if (props.isMobile) {
		return <MobileListView {...props} />;
	}

	const allSelected =
		props.entries.length > 0 &&
		props.entries.every((entry) =>
			isEntrySelected(entry, props.selectedEntries),
		);

	return (
		<div className="w-full min-w-max rounded-[6px] border border-sidebar-border bg-white/84 dark:border-white/10 dark:bg-night-2/82">
			<table className="w-full text-left text-sm border-collapse">
				<thead className="bg-sidebar-bg/85 text-body-text/70 uppercase text-[10px] font-bold tracking-wider dark:bg-night-0/94 dark:text-[#97A3B7]/78">
					<tr className="border-b border-sidebar-border dark:border-white/10">
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
						<th className="px-4 py-3">{t("files.columns.name")}</th>
						<th className="px-4 py-3 hidden md:table-cell">
							{t("files.columns.dateModified")}
						</th>
						<th className="px-4 py-3 hidden lg:table-cell">
							{t("files.columns.type")}
						</th>
						<th className="px-4 py-3 text-right hidden sm:table-cell">
							{t("files.columns.size")}
						</th>
						<th className="px-4 py-3 w-10"></th>
					</tr>
				</thead>
				<tbody className="divide-y divide-sidebar-border/70 dark:divide-white/8">
					{props.entries.map((entry) => {
						const selected = isEntrySelected(
							entry,
							props.selectedEntries,
						);
						const { icon, textColor } = getFileVisual(entry);
						return (
							<tr
								className={`cursor-pointer transition-colors hover:bg-panel-wash/80 dark:hover:bg-night-3/44 ${
									selected ? "bg-primary/5" : ""
								}`}
								key={`${entry.mountId}:${entry.path}`}
								onClick={() => props.onActivate(entry)}
								onKeyDown={(e) => {
									if (e.key === "Enter")
										props.onActivate(entry);
									if (e.key === " ") {
										e.preventDefault();
										props.onToggleSelection(entry, {
											inspectSingle: false,
										});
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
											props.onToggleSelection(entry, {
												inspectSingle: false,
											});
										}}
										onClick={(e) => e.stopPropagation()}
									/>
								</td>
								<td className="px-4 py-3">
									<div className="flex items-center gap-3 font-medium text-heading-text dark:text-[#f4f8ff]/92">
										<MaterialIcon
											className={`${textColor} text-xl`}
											name={icon}
										/>
										<div className="min-w-0 flex-1">
											<span className="block truncate">
												{entry.name}
											</span>
											{/* Mobile specific merged details row */}
											<div className="md:hidden mt-0.5 flex items-center gap-2 text-[11px] font-normal text-body-text/65 dark:text-[#97A3B7]/78">
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
												<span className="mt-0.5 block truncate text-xs text-body-text/60 dark:text-[#97A3B7]/78">
													{entry.path}
												</span>
											) : null}
										</div>
									</div>
								</td>
								<td className="hidden px-4 py-3 text-body-text/80 dark:text-[#c7d4eb]/68 md:table-cell">
									{formatDateTime(entry.modTime)}
								</td>
								<td className="hidden px-4 py-3 text-body-text/80 dark:text-[#c7d4eb]/68 lg:table-cell">
									{describeEntryType(entry)}
								</td>
								<td className="hidden px-4 py-3 text-right text-body-text/80 dark:text-[#c7d4eb]/68 sm:table-cell">
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
												label: t("common.rename"),
												icon: <IconEdit size={14} />,
												onSelect: () =>
													props.onRename(entry),
											},
											{
												label: t("common.move"),
												icon: <IconMove size={14} />,
												onSelect: () =>
													props.onMove(entry),
											},
											{
												label: t("common.copy"),
												icon: <IconCopy size={14} />,
												onSelect: () =>
													props.onCopy(entry),
											},
											{
												label: t("common.share"),
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
												label: t("common.download"),
												icon: (
													<IconDownload size={14} />
												),
												onSelect: () =>
													props.onDownload(entry),
											},
											{
												label: t("common.delete"),
												icon: <IconTrash size={14} />,
												danger: true,
												onSelect: () =>
													props.onDelete(entry),
											},
										]}
										buttonClassName="rounded-[4px] p-1.5 text-body-text/60 transition-colors hover:bg-panel-wash hover:text-heading-text dark:text-[#97A3B7]/78 dark:hover:bg-night-3 dark:hover:text-white"
										buttonContent={
											<MaterialIcon
												name="more_vert"
												className="text-lg"
											/>
										}
										buttonLabel={t("files.actions", {
											name: entry.name,
										})}
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
	const { t } = useTranslation();
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
				<span className="text-xs font-medium text-body-text/65 dark:text-[#97A3B7]/78">
					{selectionMode && props.selectedEntries.length > 0
						? t("files.selectedCount", {
								count: props.selectedEntries.length,
							})
						: t("files.itemsCount", {
								count: props.entries.length,
							})}
				</span>
				<button
					className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
						selectionMode
							? "bg-primary text-white dark:bg-dark-primary"
							: "border border-sidebar-border bg-white/80 text-body-text dark:border-white/10 dark:bg-night-2 dark:text-[#c7d4eb]/78"
					}`}
					onClick={() => setSelectionModeEnabled(!selectionMode)}
					type="button"
				>
					{selectionMode ? t("common.done") : t("common.select")}
				</button>
			</div>
			<div className="rounded-[8px] border border-sidebar-border bg-white/88 dark:border-white/10 dark:bg-night-2/84">
				{props.entries.map((entry, index) => {
					const selected = isEntrySelected(
						entry,
						props.selectedEntries,
					);
					const { icon, textColor } = getFileVisual(entry);

					return (
						<div
							className={`flex items-center gap-3 px-4 py-3 transition-colors ${
								selectionMode && selected ? "bg-primary/5" : ""
							} ${index > 0 ? "border-t border-sidebar-border/70 dark:border-white/8" : ""}`}
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
											props.onToggleSelection(entry, {
												inspectSingle: false,
											})
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
									<div className="truncate text-sm font-medium text-heading-text dark:text-[#f4f8ff]/92">
										{entry.name}
									</div>
									<div className="mt-0.5 flex items-center gap-2 text-[11px] font-normal text-body-text/65 dark:text-[#97A3B7]/78">
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
										<div className="mt-0.5 truncate text-[11px] text-body-text/60 dark:text-[#97A3B7]/78">
											{entry.path}
										</div>
									) : null}
								</div>
							</div>
							<div onClick={(e) => e.stopPropagation()}>
								<MenuButton
									actions={[
										{
											label: t("common.rename"),
											icon: <IconEdit size={14} />,
											onSelect: () =>
												props.onRename(entry),
										},
										{
											label: t("common.move"),
											icon: <IconMove size={14} />,
											onSelect: () => props.onMove(entry),
										},
										{
											label: t("common.copy"),
											icon: <IconCopy size={14} />,
											onSelect: () => props.onCopy(entry),
										},
										{
											label: t("common.share"),
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
											label: t("common.download"),
											icon: <IconDownload size={14} />,
											onSelect: () =>
												props.onDownload(entry),
										},
										{
											label: t("common.delete"),
											icon: <IconTrash size={14} />,
											danger: true,
											onSelect: () =>
												props.onDelete(entry),
										},
									]}
									align="right"
									buttonClassName="rounded-[4px] p-1.5 text-body-text/60 transition-colors hover:bg-panel-wash dark:text-[#97A3B7]/78 dark:hover:bg-night-3"
									buttonContent={
										<MaterialIcon
											name="more_vert"
											className="text-lg"
										/>
									}
									buttonLabel={t("files.actions", {
										name: entry.name,
									})}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MaterialIcon } from "@/features/shared/Icons";
import { SidebarTree } from "@/features/files/SidebarTree";
import { ResizableSidebar } from "@/features/shared/ResizableSidebar";
import {
	FileTreeNode,
	MountRoot,
	TransferTask,
	TrashItem,
} from "@/types/contracts";

export interface AppSidebarProps {
	currentMountId: string;
	currentMountPath: string;
	currentPath: string;
	expandedPaths: string[];
	isMobile: boolean;
	mobileNavOpen: boolean;
	mounts: MountRoot[];
	showHidden: boolean;
	singleMountMode: boolean;
	sharesLength: number;
	tasksLength: number;
	trashItemsLength: number;
	treeCache: Record<string, FileTreeNode[]>;
	onCloseMobileNav: () => void;
	onNavigateHome: () => void;
	onOpenShares: () => void;
	onOpenTasks: () => void;
	onOpenTrash: () => void;
	onRefresh: () => void;
	onSelectTree: (mountId: string, path: string) => void;
	onToggleTree: (mountId: string, path: string) => Promise<void>;
}

export function AppSidebar(props: AppSidebarProps) {
	const { t } = useTranslation();
	const [activeSegment, setActiveSegment] = useState<string>("home");

	useEffect(() => {
		if (props.currentMountId) {
			setActiveSegment(props.currentMountId);
		}
	}, [props.currentMountId]);

	const segmentedMounts = props.mounts.filter((m) => m.id === activeSegment);
	const visibleMounts =
		segmentedMounts.length > 0 ? segmentedMounts : props.mounts.slice(0, 1);

	return (
		<ResizableSidebar
			side="left"
			defaultWidth={256}
			className={`tencent-sidebar-panel border-r border-sidebar-border ${
				props.isMobile
					? `fixed inset-y-0 left-0 z-30 transition-transform ${props.mobileNavOpen ? "translate-x-0" : "-translate-x-full"} dark:border-white/10`
					: "relative dark:border-white/10"
			}`}
			style={props.isMobile ? { width: "280px" } : undefined}
		>
			<div className="p-6 flex items-center gap-3">
				<div className="flex rounded-[4px] border border-white/70 bg-primary p-1.5 text-white dark:border-dark-primary/30 dark:bg-dark-primary">
					<MaterialIcon name="cloud_done" />
				</div>
				<h2 className="text-lg font-bold tracking-tight text-heading-text dark:text-white">
					{t("common.appName")}
				</h2>
				{props.isMobile ? (
					<button
						className="ml-auto rounded-full p-1 text-body-text/70 transition-colors hover:bg-white/70 hover:text-heading-text dark:text-[#97A3B7]/78 dark:hover:bg-night-3 dark:hover:text-white"
						onClick={props.onCloseMobileNav}
						type="button"
					>
						<MaterialIcon name="close" />
					</button>
				) : null}
			</div>

			<nav className="flex-1 overflow-y-auto px-4 space-y-6">
				{/* Favorites */}
				<div>
						<h3 className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-body-text/60 dark:text-[#97A3B7]/78">
							{t("sidebar.favorites")}
						</h3>
					<div className="space-y-1">
						<button
							className="w-full flex items-center gap-3 rounded-[4px] border-l-2 border-primary bg-white px-3 py-2 text-left text-sm font-semibold text-primary dark:border-dark-primary dark:bg-night-3/86 dark:text-[#78A9FF]"
							onClick={props.onNavigateHome}
							type="button"
						>
								<MaterialIcon className="text-[20px]" name="star" />
								<span>{t("sidebar.quickAccess")}</span>
						</button>
						<button
							className="w-full flex items-center gap-3 rounded-[4px] px-3 py-2 text-left text-sm text-body-text transition-colors hover:bg-white/75 dark:text-[#c7d4eb]/78 dark:hover:bg-night-3"
							onClick={props.onOpenShares}
							type="button"
						>
								<MaterialIcon
									className="text-[20px]"
									name="share"
								/>
								<span>{t("sidebar.myShares")}</span>
							{props.sharesLength > 0 ? (
								<span className="ml-auto text-xs text-body-text/60 dark:text-[#97A3B7]/78">
									{props.sharesLength}
								</span>
							) : null}
						</button>
						<button
							className="w-full flex items-center gap-3 rounded-[4px] px-3 py-2 text-left text-sm text-body-text transition-colors hover:bg-white/75 dark:text-[#c7d4eb]/78 dark:hover:bg-night-3"
							onClick={props.onOpenTasks}
							type="button"
						>
								<MaterialIcon
									className="text-[20px]"
									name="schedule"
								/>
								<span>{t("sidebar.tasks")}</span>
							{props.tasksLength > 0 ? (
								<span className="ml-auto text-xs text-body-text/60 dark:text-[#97A3B7]/78">
									{props.tasksLength}
								</span>
							) : null}
						</button>
						<button
							className="w-full flex items-center gap-3 rounded-[4px] px-3 py-2 text-left text-sm text-body-text transition-colors hover:bg-white/75 dark:text-[#c7d4eb]/78 dark:hover:bg-night-3"
							onClick={props.onOpenTrash}
							type="button"
						>
								<MaterialIcon
									className="text-[20px]"
									name="delete"
								/>
								<span>{t("sidebar.trash")}</span>
							{props.trashItemsLength > 0 ? (
								<span className="ml-auto text-xs text-body-text/60 dark:text-[#97A3B7]/78">
									{props.trashItemsLength}
								</span>
							) : null}
						</button>
					</div>
				</div>

				{/* Directory Tree */}
				<div className="mt-4 px-2">
					{props.mounts.length > 1 ? (
						<div className="mb-4 relative">
							<select
								className="w-full appearance-none rounded-[4px] border border-sidebar-border bg-white/85 py-2.5 pl-3 pr-8 text-sm font-semibold text-heading-text transition-all hover:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20 dark:border-white/10 dark:bg-night-2/88 dark:text-white dark:hover:bg-night-3"
								value={activeSegment}
								onChange={(e) => {
									const newMountId = e.target.value;
									setActiveSegment(newMountId);
									props.onSelectTree(newMountId, "/");
								}}
							>
								{props.mounts.map((m) => (
									<option key={m.id} value={m.id}>
										{m.id === "home"
											? "🏠 "
											: m.id === "work"
												? "💼 "
												: "📂 "}
										{m.name.charAt(0).toUpperCase() +
											m.name.slice(1)}
									</option>
								))}
							</select>
						</div>
					) : null}

					<SidebarTree
						currentMountId={props.currentMountId}
						currentPath={props.currentPath}
						expandedPaths={props.expandedPaths}
						mounts={visibleMounts}
						singleMountMode={true}
						onSelect={props.onSelectTree}
						onToggle={props.onToggleTree}
						treeCache={props.treeCache}
						treeCacheKeySuffix={props.showHidden ? "1" : "0"}
					/>
				</div>
			</nav>

			{/* Storage */}
			<div className="p-4 border-t border-sidebar-border dark:border-white/10">
				<div className="rounded-[4px] border border-sidebar-border bg-white/80 p-4 dark:border-white/10 dark:bg-night-2/84">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-medium text-body-text/75 dark:text-[#c7d4eb]/78">
								{t("sidebar.storage")}
							</span>
						</div>
					<p className="mb-2 overflow-hidden text-ellipsis text-[10px] text-body-text/70 dark:text-[#97A3B7]/78">
						{props.currentMountPath || "/"}
					</p>
					<button
						className="w-full rounded-[4px] border border-primary/25 bg-white py-1.5 text-xs font-bold text-primary transition-colors hover:bg-panel-wash dark:border-dark-primary/35 dark:bg-night-2 dark:text-[#78A9FF] dark:hover:bg-night-3"
						onClick={props.onRefresh}
						type="button"
						>
							{t("common.refresh")}
						</button>
				</div>
			</div>
		</ResizableSidebar>
	);
}

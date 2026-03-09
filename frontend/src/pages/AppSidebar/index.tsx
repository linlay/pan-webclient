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
	tasksLength: number;
	trashItemsLength: number;
	treeCache: Record<string, FileTreeNode[]>;
	onCloseMobileNav: () => void;
	onNavigateHome: () => void;
	onOpenTasks: () => void;
	onOpenTrash: () => void;
	onRefresh: () => void;
	onSelectTree: (mountId: string, path: string) => void;
	onToggleTree: (mountId: string, path: string) => Promise<void>;
}

export function AppSidebar(props: AppSidebarProps) {
	return (
		<ResizableSidebar
			side="left"
			defaultWidth={256}
			className={`border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-bg-dark/50 backdrop-blur-md ${props.isMobile ? `fixed inset-y-0 left-0 z-30 transition-transform ${props.mobileNavOpen ? "translate-x-0" : "-translate-x-full"}` : ""}`}
		>
			<div className="p-6 flex items-center gap-3">
				<div className="flex bg-primary p-1.5 rounded-lg text-white">
					<span className="material-symbols-outlined">
						cloud_done
					</span>
				</div>
				<h2 className="text-lg font-bold tracking-tight">
					Cloud Drive
				</h2>
				{props.isMobile ? (
					<button
						className="ml-auto p-1 text-slate-400"
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
					<h3 className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
						Favorites
					</h3>
					<div className="space-y-1">
						<button
							className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium text-left text-sm"
							onClick={props.onNavigateHome}
							type="button"
						>
							<span className="material-symbols-outlined text-[20px] filled-icon">
								star
							</span>
							<span>Quick Access</span>
						</button>
						<button
							className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left text-sm"
							onClick={props.onOpenTasks}
							type="button"
						>
							<span className="material-symbols-outlined text-[20px]">
								schedule
							</span>
							<span>Tasks</span>
							{props.tasksLength > 0 ? (
								<span className="ml-auto text-xs text-slate-400">
									{props.tasksLength}
								</span>
							) : null}
						</button>
						<button
							className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left text-sm"
							onClick={props.onOpenTrash}
							type="button"
						>
							<span className="material-symbols-outlined text-[20px]">
								delete
							</span>
							<span>Trash</span>
							{props.trashItemsLength > 0 ? (
								<span className="ml-auto text-xs text-slate-400">
									{props.trashItemsLength}
								</span>
							) : null}
						</button>
					</div>
				</div>

				{/* Directory Tree */}
				<SidebarTree
					currentMountId={props.currentMountId}
					currentPath={props.currentPath}
					expandedPaths={props.expandedPaths}
					mounts={props.mounts}
					singleMountMode={props.singleMountMode}
					onSelect={props.onSelectTree}
					onToggle={props.onToggleTree}
					treeCache={props.treeCache}
					treeCacheKeySuffix={props.showHidden ? "1" : "0"}
				/>
			</nav>

			{/* Storage */}
			<div className="p-4 border-t border-slate-200 dark:border-slate-800">
				<div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-medium">Storage</span>
					</div>
					<p className="text-[10px] text-slate-500 mb-2 overflow-hidden text-ellipsis">
						{props.currentMountPath || "/"}
					</p>
					<button
						className="w-full py-1.5 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors"
						onClick={props.onRefresh}
						type="button"
					>
						Refresh
					</button>
				</div>
			</div>
		</ResizableSidebar>
	);
}

import type { FileTreeNode, MountRoot } from "../../types/contracts/index";

export function SidebarTree(props: {
	mounts: MountRoot[];
	singleMountMode: boolean;
	currentMountId: string;
	currentPath: string;
	treeCache: Record<string, FileTreeNode[]>;
	treeCacheKeySuffix: string;
	expandedPaths: string[];
	onSelect: (mountId: string, path: string) => void;
	onToggle: (mountId: string, path: string) => void | Promise<void>;
}) {
	return (
		<div className="flex-1 overflow-y-auto px-4 space-y-6">
			{props.mounts.map((mount) => {
				const children =
					props.treeCache[
						treeCacheKey(mount.id, "/", props.treeCacheKeySuffix)
					] ?? [];
				const activeRoot =
					props.currentMountId === mount.id &&
					props.currentPath === "/";

				return (
					<section key={mount.id}>
						{props.singleMountMode ? null : (
							<button
								className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
									activeRoot
										? "bg-primary/10 text-primary font-medium"
										: "hover:bg-slate-100 dark:hover:bg-slate-800"
								}`}
								onClick={() => props.onSelect(mount.id, "/")}
								type="button"
							>
								<span className="material-symbols-outlined text-[20px] filled-icon">
									hard_drive
								</span>
								<div className="min-w-0">
									<span className="block text-sm font-medium">
										{mount.name}
									</span>
									<span className="block text-xs text-slate-500 truncate">
										{mount.path}
									</span>
								</div>
							</button>
						)}

						{/* Directory Tree */}
						<div className="mt-2">
							<h3 className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
								Directory Tree
							</h3>
							<div
								className={`space-y-1 ${props.singleMountMode ? "" : "ml-2"}`}
							>
								{children.map((child) => (
									<TreeBranch
										currentMountId={props.currentMountId}
										currentPath={props.currentPath}
										expandedPaths={props.expandedPaths}
										key={`${mount.id}:${child.path}`}
										mountId={mount.id}
										node={child}
										onSelect={props.onSelect}
										onToggle={props.onToggle}
										treeCache={props.treeCache}
										treeCacheKeySuffix={
											props.treeCacheKeySuffix
										}
										depth={0}
									/>
								))}
							</div>
						</div>
					</section>
				);
			})}
		</div>
	);
}

function TreeBranch(props: {
	mountId: string;
	node: FileTreeNode;
	currentMountId: string;
	currentPath: string;
	treeCache: Record<string, FileTreeNode[]>;
	treeCacheKeySuffix: string;
	expandedPaths: string[];
	onSelect: (mountId: string, path: string) => void;
	onToggle: (mountId: string, path: string) => void | Promise<void>;
	depth: number;
}) {
	const expanded = props.expandedPaths.includes(props.node.path);
	const active =
		props.currentMountId === props.mountId &&
		props.currentPath === props.node.path;
	const children =
		props.treeCache[
			treeCacheKey(
				props.mountId,
				props.node.path,
				props.treeCacheKeySuffix,
			)
		] ?? [];

	return (
		<div>
			<div
				className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
					active
						? "bg-primary/5 text-primary"
						: "hover:bg-slate-100 dark:hover:bg-slate-800"
				}`}
				style={{ paddingLeft: `${props.depth * 16 + 12}px` }}
				onClick={() => props.onSelect(props.mountId, props.node.path)}
			>
				{props.node.hasChildren ? (
					<button
						className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0 border-0 bg-transparent"
						onClick={(e) => {
							e.stopPropagation();
							props.onToggle(props.mountId, props.node.path);
						}}
						type="button"
					>
						<span className="material-symbols-outlined text-sm">
							{expanded ? "expand_more" : "chevron_right"}
						</span>
					</button>
				) : (
					<span className="material-symbols-outlined text-sm text-slate-300">
						chevron_right
					</span>
				)}
				<span className={`text-sm ${active ? "font-medium" : ""}`}>
					{props.node.name}
				</span>
			</div>

			{expanded && children.length > 0 ? (
				<div className="border-l border-slate-200 dark:border-slate-800 ml-4">
					{children.map((child) => (
						<TreeBranch
							currentMountId={props.currentMountId}
							currentPath={props.currentPath}
							expandedPaths={props.expandedPaths}
							key={`${props.mountId}:${child.path}`}
							mountId={props.mountId}
							node={child}
							onSelect={props.onSelect}
							onToggle={props.onToggle}
							treeCache={props.treeCache}
							treeCacheKeySuffix={props.treeCacheKeySuffix}
							depth={props.depth + 1}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

function treeCacheKey(mountId: string, path: string, showHidden: string) {
	return `${mountId}:${showHidden}:${path}`;
}

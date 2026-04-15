import { MaterialIcon } from "../shared/Icons";
import type { FileTreeNode, MountRoot } from "../../types/contracts/index";
import { treeCacheKey } from "@/utils";

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
								className={`w-full flex items-center gap-3 rounded-[4px] px-3 py-2 text-left transition-colors ${
									activeRoot
										? "border-l-2 border-primary bg-white font-semibold text-primary dark:border-dark-primary/90 dark:bg-night-3 dark:text-[#8CB6FF]"
										: "text-body-text hover:bg-white/75 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2/88"
								}`}
								onClick={() => props.onSelect(mount.id, "/")}
								type="button"
							>
								<MaterialIcon className="text-[20px]" name="hard_drive" />
								<div className="min-w-0">
									<span className="block text-sm font-medium">
										{mount.name}
									</span>
									<span className="block truncate text-xs text-body-text/65 dark:text-[#97A3B7]/78">
										{mount.path}
									</span>
								</div>
							</button>
						)}

						{/* Directory Tree */}
						<div className="mt-2">
							<h3 className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-body-text/60 dark:text-[#97A3B7]/78">
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
				className={`flex cursor-pointer items-center gap-2 rounded-[4px] px-3 py-1.5 transition-colors ${
					active
						? "bg-primary/6 text-primary dark:bg-night-3 dark:text-[#8CB6FF]"
						: "text-body-text hover:bg-white/75 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2/88"
				}`}
				style={{ paddingLeft: `${props.depth * 16 + 12}px` }}
				onClick={() => props.onSelect(props.mountId, props.node.path)}
			>
				{props.node.hasChildren ? (
					<button
						className="border-0 bg-transparent p-0 text-body-text/55 hover:text-primary dark:text-[#97A3B7]/78 dark:hover:text-[#78A9FF]"
						onClick={(e) => {
							e.stopPropagation();
							props.onToggle(props.mountId, props.node.path);
						}}
						type="button"
					>
						<MaterialIcon
							className="text-sm"
							name={expanded ? "expand_more" : "chevron_right"}
						/>
					</button>
				) : (
					<MaterialIcon className="text-sm text-body-text/30 dark:text-[#97A3B7]/38" name="chevron_right" />
				)}
				<span className={`text-sm ${active ? "font-semibold" : ""}`}>
					{props.node.name}
				</span>
			</div>

			{expanded && children.length > 0 ? (
				<div className="ml-4 border-l border-sidebar-border dark:border-white/8">
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

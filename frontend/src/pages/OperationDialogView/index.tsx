import { SidebarTree } from "@/features/files/SidebarTree";
import type { FileTreeNode, MountRoot } from "@/types/contracts";
import { OperationDialog } from "@/types/home";
import {
	dialogEyebrow,
	dialogTitle,
	dialogDescription,
	dialogFieldLabel,
	dialogConfirmLabel,
} from "@/utils";

export function OperationDialogView(props: {
	dialog: NonNullable<OperationDialog>;
	directoryTree?: {
		mount: MountRoot | null;
		treeCache: Record<string, FileTreeNode[]>;
		treeCacheKeySuffix: string;
		expandedPaths: string[];
		onSelect: (path: string) => void;
		onToggle: (path: string) => void | Promise<void>;
	};
	onClose: () => void;
	onChange: (v: string) => void;
	onSubmit: () => void;
}) {
	const value =
		props.dialog.kind === "create-folder" ||
		props.dialog.kind === "rename" ||
		props.dialog.kind === "batch-download"
			? props.dialog.value
			: props.dialog.kind === "move" || props.dialog.kind === "copy"
				? props.dialog.targetDir
				: "";
	const requiresInput = props.dialog.kind !== "delete";
	const selectedItems =
		props.dialog.kind === "create-folder" || props.dialog.kind === "rename"
			? []
			: props.dialog.entries;

	return (
		<div
			className="modal-backdrop"
			onClick={() => {
				if (!props.dialog.submitting) props.onClose();
			}}
			role="presentation"
		>
			<form
				className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-fade-in`}
				onClick={(e) => e.stopPropagation()}
				onSubmit={(e) => {
					e.preventDefault();
					props.onSubmit();
				}}
			>
				<div className="p-6 pb-4">
					<p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
						{dialogEyebrow(props.dialog.kind)}
					</p>
					<h2 className="text-lg font-bold">
						{dialogTitle(props.dialog)}
					</h2>
					<p className="text-sm text-slate-500 mt-1">
						{dialogDescription(props.dialog)}
					</p>
				</div>

				{requiresInput ? (
					<div className="px-6 pb-4">
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
							{dialogFieldLabel(props.dialog.kind)}
						</label>
						<input
							autoFocus
							className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
							onChange={(e) => props.onChange(e.target.value)}
							value={value}
						/>
					</div>
				) : null}

				{(props.dialog.kind === "move" ||
					props.dialog.kind === "copy") &&
				props.directoryTree?.mount ? (
					<div className="px-6 pb-4">
						<div className="mb-2 flex items-center justify-between">
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
								目标层级
							</label>
							<span className="text-xs text-slate-400">
								{props.directoryTree.mount.name}
							</span>
						</div>
						<p className="mb-3 text-xs text-slate-500">
							从当前工作区目录树中选择目标目录，也可以直接修改上方路径。
						</p>
						<div className="max-h-72 py-4 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40">
							<SidebarTree
								currentMountId={props.directoryTree.mount.id}
								currentPath={props.dialog.targetDir}
								expandedPaths={
									props.directoryTree.expandedPaths
								}
								mounts={[props.directoryTree.mount]}
								onSelect={(_, path) =>
									props.directoryTree?.onSelect(path)
								}
								onToggle={(_, path) =>
									props.directoryTree?.onToggle(path)
								}
								singleMountMode={false}
								treeCache={props.directoryTree.treeCache}
								treeCacheKeySuffix={
									props.directoryTree.treeCacheKeySuffix
								}
							/>
						</div>
					</div>
				) : null}

				{selectedItems.length > 0 ? (
					<div className="px-6 pb-4">
						<span className="text-xs uppercase tracking-wider text-slate-400">
							涉及项目
						</span>
						<div className="flex flex-wrap gap-1.5 mt-2">
							{selectedItems.slice(0, 6).map((e) => (
								<span
									className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-full"
									key={`${e.mountId}:${e.path}`}
								>
									{e.name}
								</span>
							))}
							{selectedItems.length > 6 ? (
								<span className="px-2.5 py-1 text-xs text-slate-400">
									+{selectedItems.length - 6}
								</span>
							) : null}
						</div>
					</div>
				) : null}

				{props.dialog.error ? (
					<div className="mx-6 mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-4 py-3">
						{props.dialog.error}
					</div>
				) : null}

				<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
					<button
						className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
						disabled={props.dialog.submitting}
						onClick={props.onClose}
						type="button"
					>
						取消
					</button>
					<button
						className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${props.dialog.kind === "delete" ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"}`}
						disabled={props.dialog.submitting}
						type="submit"
					>
						{props.dialog.submitting
							? "处理中..."
							: dialogConfirmLabel(props.dialog.kind)}
					</button>
				</div>
			</form>
		</div>
	);
}

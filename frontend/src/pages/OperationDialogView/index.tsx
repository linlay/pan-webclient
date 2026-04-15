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
import { useTranslation } from "react-i18next";

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
	const { t } = useTranslation();
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
				className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white animate-fade-in dark:border-white/10 dark:bg-night-0/98"
				onClick={(e) => e.stopPropagation()}
				onSubmit={(e) => {
					e.preventDefault();
					props.onSubmit();
				}}
			>
				<div className="p-6 pb-4">
					<p className="mb-1 text-xs uppercase tracking-wider text-slate-400 dark:text-[#97A3B7]/78">
						{dialogEyebrow(props.dialog.kind)}
					</p>
					<h2 className="text-lg font-bold text-heading-text dark:text-white">
						{dialogTitle(props.dialog)}
					</h2>
					<p className="mt-1 text-sm text-slate-500 dark:text-[#97A3B7]/78">
						{dialogDescription(props.dialog)}
					</p>
				</div>

				{requiresInput ? (
					<div className="px-6 pb-4">
						<label className="mb-2 block text-sm font-medium text-slate-700 dark:text-[#c7d4eb]/78">
							{dialogFieldLabel(props.dialog.kind)}
						</label>
						<input
							autoFocus
							className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-night-2/96 dark:text-white dark:focus:border-dark-primary dark:focus:ring-dark-primary/20"
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
							<label className="block text-sm font-medium text-slate-700 dark:text-[#c7d4eb]/78">
								{t("dialog.targetLevel")}
							</label>
							<span className="text-xs text-slate-400 dark:text-[#97A3B7]/78">
								{props.directoryTree.mount.name}
							</span>
						</div>
						<p className="mb-3 text-xs text-slate-500 dark:text-[#97A3B7]/78">
							{t("dialog.pickTargetDir")}
						</p>
						<div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 py-4 dark:border-white/10 dark:bg-night-1/96">
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
						<span className="text-xs uppercase tracking-wider text-slate-400 dark:text-[#97A3B7]/78">
							{t("dialog.involvedItems")}
						</span>
						<div className="flex flex-wrap gap-1.5 mt-2">
							{selectedItems.slice(0, 6).map((e) => (
								<span
									className="rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-night-3/92 dark:text-[#c7d4eb]/78"
									key={`${e.mountId}:${e.path}`}
								>
									{e.name}
								</span>
							))}
							{selectedItems.length > 6 ? (
								<span className="px-2.5 py-1 text-xs text-slate-400 dark:text-[#8FA7CF]/70">
									+{selectedItems.length - 6}
								</span>
							) : null}
						</div>
					</div>
				) : null}

				{props.dialog.error ? (
					<div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
						{props.dialog.error}
					</div>
				) : null}

				<div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-night-0/94">
					<button
						className="rounded-lg border border-slate-200 px-4 py-2 text-sm transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2"
						disabled={props.dialog.submitting}
						onClick={props.onClose}
						type="button"
					>
						{t("common.cancel")}
					</button>
					<button
						className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${props.dialog.kind === "delete" ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"}`}
						disabled={props.dialog.submitting}
						type="submit"
					>
						{props.dialog.submitting
							? t("common.processing")
							: dialogConfirmLabel(props.dialog.kind)}
					</button>
				</div>
			</form>
		</div>
	);
}

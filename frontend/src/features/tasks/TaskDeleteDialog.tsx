import { MaterialIcon } from "@/features/shared/Icons";
import type { TransferTask } from "@/types/contracts";
import { taskPrimaryLabel } from "@/utils";

export function TaskDeleteDialog(props: {
	error: string;
	onClose: () => void;
	onSubmit: () => void;
	submitting: boolean;
	task: TransferTask;
}) {
	const removesArtifact =
		props.task.kind === "download" && props.task.status === "success";

	return (
		<div
			className="modal-backdrop"
			onClick={() => {
				if (!props.submitting) props.onClose();
			}}
			role="presentation"
		>
			<form
				className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fade-in dark:border-slate-800 dark:bg-slate-900"
				onClick={(e) => e.stopPropagation()}
				onSubmit={(e) => {
					e.preventDefault();
					props.onSubmit();
				}}
				role="alertdialog"
			>
				<div className="p-6 pb-4">
					<p className="mb-1 text-xs uppercase tracking-wider text-slate-400">
						Task
					</p>
					<div className="flex items-start gap-3">
						<div className="mt-0.5 rounded-xl bg-red-50 p-2 text-red-500 dark:bg-red-500/10">
							<MaterialIcon name="delete" className="text-lg" />
						</div>
						<div className="min-w-0">
							<h2 className="text-lg font-bold text-slate-900 dark:text-white">
								Delete task history
							</h2>
							<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
								This cannot be undone.
								{removesArtifact
									? " The generated download archive will be removed as well."
									: ""}
							</p>
						</div>
					</div>
				</div>

				<div className="px-6 pb-4">
					<div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
						<p className="text-xs uppercase tracking-wider text-slate-400">
							Task name
						</p>
						<p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
							{taskPrimaryLabel(props.task)}
						</p>
						<p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
							{props.task.detail}
						</p>
					</div>
				</div>

				{props.error ? (
					<div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500 dark:border-red-500/20 dark:bg-red-500/10">
						{props.error}
					</div>
				) : null}

				<div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
					<button
						autoFocus
						className="rounded-lg border border-slate-200 px-4 py-2 text-sm transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
						disabled={props.submitting}
						onClick={props.onClose}
						type="button"
					>
						Cancel
					</button>
					<button
						className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={props.submitting}
						type="submit"
					>
						{props.submitting ? "Deleting..." : "Delete"}
					</button>
				</div>
			</form>
		</div>
	);
}

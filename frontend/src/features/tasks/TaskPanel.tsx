import type { TransferTask } from "../../types/contracts/index";
import { MaterialIcon } from "../shared/Icons";
import {
	formatBytes,
	formatDateTime,
	taskCompletedBytes,
	taskHasByteProgress,
	taskPrimaryLabel,
	taskProgressPercent,
	taskSummary,
	taskTotalBytes,
	shouldShowTaskProgress,
} from "@/utils";

function statusColor(status: TransferTask["status"]) {
	switch (status) {
		case "success":
			return "text-green-500";
		case "failed":
			return "text-red-500";
		case "running":
			return "text-primary";
		default:
			return "text-slate-400";
	}
}

function statusLabel(status: TransferTask["status"]) {
	switch (status) {
		case "pending":
			return <MaterialIcon name="schedule" className="text-[14px]" />;
		case "running":
			return (
				<MaterialIcon
					name="sync"
					className="text-[14px] animate-spin-slow"
				/>
			);
		case "success":
			return <MaterialIcon name="check_circle" className="text-[14px]" />;
		case "failed":
			return <MaterialIcon name="error" className="text-[14px]" />;
	}
}

function progressColor(status: TransferTask["status"]) {
	switch (status) {
		case "success":
			return "bg-green-500";
		case "failed":
			return "bg-red-500";
		default:
			return "bg-primary";
	}
}

export function TaskPanel(props: {
	tasks: TransferTask[];
	collapsed: boolean;
	isMobile: boolean;
	onDeleteTask: (id: string) => void;
	onToggle: () => void;
	onOpenTask: (id: string) => void;
	onBack: () => void;
}) {
	return (
		<div className="flex h-full min-h-0 flex-col gap-4 p-6">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-slate-400">
						Tasks
					</p>
					<h3 className="text-lg font-bold">传输任务</h3>
				</div>
				{!props.isMobile ? (
					<div className="flex items-center gap-2">
						<button
							className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
							onClick={props.onBack}
							type="button"
						>
							返回
						</button>
						<button
							className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
							onClick={props.onToggle}
							type="button"
						>
							<MaterialIcon
								name={
									props.collapsed
										? "expand_more"
										: "expand_less"
								}
							/>
						</button>
					</div>
				) : null}
			</div>

			{!props.collapsed ? (
				<div className="min-h-0 flex-1 overflow-y-auto pr-1">
					<div className="space-y-2">
						{props.tasks.length === 0 ? (
							<div className="text-center py-8">
								<MaterialIcon
									name="cloud_done"
									className="text-slate-300 dark:text-slate-600 !text-5xl mb-2"
								/>
								<p className="text-sm text-slate-400">
									暂无任务
								</p>
							</div>
						) : (
							props.tasks.map((task) => {
								const canDelete =
									task.status === "success" ||
									task.status === "failed";
								return (
									<div
										className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
										key={task.id}
										onClick={() =>
											props.onOpenTask(task.id)
										}
										onKeyDown={(event) => {
											if (
												event.key === "Enter" ||
												event.key === " "
											) {
												event.preventDefault();
												props.onOpenTask(task.id);
											}
										}}
										role="button"
										tabIndex={0}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex min-w-0 items-start gap-3">
												<div className="mt-0.5 rounded-xl bg-white p-2 shadow-sm dark:bg-slate-900/70">
													<MaterialIcon
														name={
															task.kind ===
															"upload"
																? "upload"
																: "download"
														}
														className={`text-lg ${statusColor(task.status)}`}
													/>
												</div>
												<div className="min-w-0">
													<div className="flex items-center gap-2">
														<p className="truncate text-sm font-semibold">
															{taskPrimaryLabel(
																task,
															)}
														</p>
														<span
															className={`${statusColor(task.status)}`}
														>
															{statusLabel(
																task.status,
															)}
														</span>
													</div>
													<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
														{taskSummary(task)}
														{taskTotalBytes(task) >
														0
															? ` · ${formatBytes(taskTotalBytes(task))}`
															: ""}
													</p>
													<p className="mt-1 truncate text-[11px] text-slate-400">
														{task.detail}
													</p>
												</div>
											</div>
											<div className="flex flex-shrink-0 items-center gap-1">
												{task.status === "success" &&
												task.downloadUrl ? (
													<button
														className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-500 dark:hover:bg-slate-700"
														title="Open"
														type="button"
													>
														<MaterialIcon
															name="open_in_new"
															className="text-primary text-sm"
														/>
													</button>
												) : null}
												{task.status === "pending" ||
												task.status === "running" ? (
													<div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
												) : null}
												{canDelete ? (
													<button
														className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-500 dark:hover:bg-slate-700"
														onClick={(e) => {
															e.stopPropagation();
															props.onDeleteTask(
																task.id,
															);
														}}
														title="Delete task"
														type="button"
													>
														<MaterialIcon
															name="delete"
															className="text-sm"
														/>
													</button>
												) : null}
											</div>
										</div>
										{shouldShowTaskProgress(task) ? (
											<div className="mt-3">
												<div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
													<div
														className={`h-full rounded-full transition-all ${progressColor(task.status)}`}
														style={{
															width: `${taskProgressPercent(task)}%`,
														}}
													/>
												</div>
												<div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
													<span>
														{taskHasByteProgress(task)
															? `${formatBytes(taskCompletedBytes(task))} / ${formatBytes(taskTotalBytes(task))}`
															: task.status === "success"
																? "100%"
																: ""}
													</span>
													<span>
														{formatDateTime(
															task.updatedAt,
														)}
													</span>
												</div>
											</div>
										) : (
											<p className="mt-3 text-[11px] text-slate-400">
												{formatDateTime(task.updatedAt)}
											</p>
										)}
									</div>
								);
							})
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}

import type { TransferTask } from "../../types/contracts/index";
import { MaterialIcon } from "../shared/Icons";
import {
	formatBytes,
	formatDateTime,
	taskDisplayDetail,
	taskFooterLabel,
	isDownloadTaskReady,
	isUploadTaskComplete,
	taskPrimaryLabel,
	taskProgressPercent,
	taskSummary,
	taskTotalBytes,
	shouldShowTaskProgress,
} from "@/utils";
import { useTranslation } from "react-i18next";

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
	onCancelTask: (id: string) => void;
	isMobile: boolean;
	onDeleteTask: (id: string) => void;
	onToggle: () => void;
	onOpenTask: (id: string) => void;
	onBack: () => void;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex h-full min-h-0 flex-col gap-4 p-6 text-body-text dark:text-[#f4f8ff]/92">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-slate-400 dark:text-[#97A3B7]/78">
						{t("sidebar.tasks")}
					</p>
					<h3 className="text-lg font-bold text-heading-text dark:text-white">{t("tasks.panelTitle")}</h3>
				</div>
				{!props.isMobile ? (
					<div className="flex items-center gap-2">
						<button
							className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2"
							onClick={props.onBack}
							type="button"
						>
							{t("tasks.back")}
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
									className="text-slate-300 dark:text-[#355078] !text-5xl mb-2"
								/>
								<p className="text-sm text-slate-400 dark:text-[#97A3B7]/78">
									{t("tasks.empty")}
								</p>
							</div>
						) : (
							props.tasks.map((task) => {
								const canCancel = task.status === "pending";
								const canDelete =
									task.status === "success" ||
									task.status === "failed";
								const readyToDownload =
									isDownloadTaskReady(task);
								const uploadCompleted =
									isUploadTaskComplete(task);
								return (
									<div
										className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-night-2/96 dark:hover:bg-night-3"
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
												<div className="mt-0.5 rounded-xl border border-sidebar-border bg-white p-2 dark:border-white/10 dark:bg-night-1">
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
														<p className="truncate text-sm font-semibold text-heading-text dark:text-white">
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
													<p className="mt-1 text-xs text-slate-500 dark:text-[#97A3B7]/78">
														{taskSummary(task)}
														{taskTotalBytes(task) >
														0
															? readyToDownload
																? ""
																: ` · ${formatBytes(taskTotalBytes(task))}`
															: ""}
														{"  " +
															taskDisplayDetail(
																task,
															)}
													</p>
													<p className="mt-1 truncate text-[11px] text-slate-400 dark:text-[#8FA7CF]/70"></p>
												</div>
											</div>
											<div className="flex flex-shrink-0 items-center gap-1">
												{readyToDownload ? (
													<button
														className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-500 dark:hover:bg-night-3"
														onClick={(event) => {
															event.stopPropagation();
															props.onOpenTask(
																task.id,
															);
														}}
														title={t("tasks.downloadZip")}
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
												{canCancel ? (
													<button
														className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-500 dark:hover:bg-night-3"
														onClick={(event) => {
															event.stopPropagation();
															props.onCancelTask(
																task.id,
															);
														}}
														title={t("tasks.cancelTask")}
														type="button"
													>
														<MaterialIcon
															name="close"
															className="text-sm"
														/>
													</button>
												) : null}
												{canDelete ? (
													<button
														className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-500 dark:hover:bg-night-3"
														onClick={(e) => {
															e.stopPropagation();
															props.onDeleteTask(
																task.id,
															);
														}}
														title={t("tasks.deleteTask")}
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
												<div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-night-3">
													<div
														className={`h-full rounded-full transition-all ${progressColor(task.status)}`}
														style={{
															width: `${taskProgressPercent(task)}%`,
														}}
													/>
												</div>
												<div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-[#97A3B7]/70">
													<span>
														{taskFooterLabel(task)}
													</span>
													<span>
														{formatDateTime(
															task.updatedAt,
														)}
													</span>
												</div>
											</div>
										) : (
											<p className="mt-3 text-[11px] text-slate-400 dark:text-[#97A3B7]/70">
												{readyToDownload ||
												uploadCompleted
													? `${taskFooterLabel(task)} · `
													: ""}
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

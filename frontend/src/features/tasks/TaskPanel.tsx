import type { TransferTask } from "../../types/contracts/index";
import { MaterialIcon } from "../shared/Icons";

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
			return "等待中";
		case "running":
			return "进行中";
		case "success":
			return "已完成";
		case "failed":
			return "失败";
	}
}

function formatTime(value: number) {
	return new Date(value * 1000).toLocaleString();
}

export function TaskPanel(props: {
	tasks: TransferTask[];
	collapsed: boolean;
	onToggle: () => void;
	onOpenTask: (id: string) => void;
	onBack: () => void;
}) {
	return (
		<div className="p-6 flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-slate-400">
						Tasks
					</p>
					<h3 className="text-lg font-bold">传输任务</h3>
				</div>
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
								props.collapsed ? "expand_more" : "expand_less"
							}
						/>
					</button>
				</div>
			</div>

			{!props.collapsed ? (
				<div className="space-y-2">
					{props.tasks.length === 0 ? (
						<div className="text-center py-8">
							<MaterialIcon
								name="cloud_done"
								className="text-slate-300 dark:text-slate-600 !text-5xl mb-2"
							/>
							<p className="text-sm text-slate-400">暂无任务</p>
						</div>
					) : (
						props.tasks.map((task) => (
							<button
								className="w-full flex items-center justify-between gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
								key={task.id}
								onClick={() => props.onOpenTask(task.id)}
								type="button"
							>
								<div className="flex items-center gap-3 min-w-0">
									<MaterialIcon
										name={
											task.kind === "upload"
												? "upload"
												: "download"
										}
										className={`text-lg ${statusColor(task.status)}`}
									/>
									<div className="min-w-0">
										<p className="text-sm font-medium truncate">
											{task.detail}
										</p>
										<p className="text-xs text-slate-400 mt-0.5">
											{statusLabel(task.status)} ·{" "}
											{formatTime(task.updatedAt)}
										</p>
									</div>
								</div>
								{task.status === "success" &&
								task.downloadUrl ? (
									<MaterialIcon
										name="open_in_new"
										className="text-primary text-sm flex-shrink-0"
									/>
								) : null}
								{task.status === "pending" ||
								task.status === "running" ? (
									<div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
								) : null}
							</button>
						))
					)}
				</div>
			) : null}
		</div>
	);
}

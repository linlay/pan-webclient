import type { TrashItem } from "../../types/contracts/index";
import { MaterialIcon } from "../shared/Icons";
import { formatDateTime } from "@/utils";
import { useTranslation } from "react-i18next";

export function TrashPanel(props: {
	items: TrashItem[];
	isMobile: boolean;
	onRestore: (id: string) => void;
	onDelete: (id: string) => void;
	onRefresh: () => void;
	onBack: () => void;
}) {
	const { t } = useTranslation();
	return (
		<div className="p-6 flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-slate-400">
						{t("sidebar.trash")}
					</p>
					<h3 className="text-lg font-bold">{t("trash.panelTitle")}</h3>
				</div>
				{!props.isMobile ? (
					<div className="flex items-center gap-2">
						<button
							className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
							onClick={props.onRefresh}
							type="button"
						>
							<MaterialIcon name="refresh" />
						</button>
						<button
							className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
							onClick={props.onBack}
							type="button"
						>
							{t("common.back")}
						</button>
					</div>
				) : null}
			</div>

			<div className="space-y-2">
				{props.items.length === 0 ? (
					<div className="text-center py-8">
						<MaterialIcon
							name="delete_sweep"
							className="text-slate-300 dark:text-slate-600 !text-5xl mb-2"
						/>
						<p className="text-sm text-slate-400">
							{t("trash.empty")}
						</p>
					</div>
				) : (
					props.items.map((item) => (
						<div
							className="flex items-center justify-between gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50"
							key={item.id}
						>
							<div className="flex items-center gap-3 min-w-0">
								<MaterialIcon
									name={item.isDir ? "folder" : "description"}
									className={`text-lg ${item.isDir ? "text-blue-500 filled-icon" : "text-slate-400"}`}
								/>
								<div className="min-w-0">
									<p className="text-sm font-medium truncate">
										{item.name}
									</p>
									<p className="text-xs text-slate-400 truncate">
										{item.originalPath} ·{" "}
										{formatDateTime(item.deletedAt)}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-1 flex-shrink-0">
								<button
									className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"
									onClick={() => props.onRestore(item.id)}
									title={t("trash.restore")}
									type="button"
								>
									<MaterialIcon
										name="restore"
										className="text-sm"
									/>
								</button>
								<button
									className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
									onClick={() => props.onDelete(item.id)}
									title={t("trash.deletePermanently")}
									type="button"
								>
									<MaterialIcon
										name="delete_forever"
										className="text-sm"
									/>
								</button>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}

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
		<div className="flex flex-col gap-4 p-6 text-body-text dark:text-[#f4f8ff]/92">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-slate-400 dark:text-[#97A3B7]/78">
						{t("sidebar.trash")}
					</p>
					<h3 className="text-lg font-bold text-heading-text dark:text-white">{t("trash.panelTitle")}</h3>
				</div>
				{!props.isMobile ? (
					<div className="flex items-center gap-2">
						<button
							className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:text-[#97A3B7]/78 dark:hover:bg-night-2"
							onClick={props.onRefresh}
							type="button"
						>
							<MaterialIcon name="refresh" />
						</button>
						<button
							className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2"
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
							className="text-slate-300 dark:text-[#355078] !text-5xl mb-2"
						/>
						<p className="text-sm text-slate-400 dark:text-[#97A3B7]/78">
							{t("trash.empty")}
						</p>
					</div>
				) : (
					props.items.map((item) => (
						<div
							className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-night-2/96"
							key={item.id}
						>
							<div className="flex items-center gap-3 min-w-0">
								<MaterialIcon
									name={item.isDir ? "folder" : "description"}
									className={`text-lg ${item.isDir ? "text-[#78A9FF] filled-icon" : "text-slate-400 dark:text-[#97A3B7]/78"}`}
								/>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium text-heading-text dark:text-white">
										{item.name}
									</p>
									<p className="truncate text-xs text-slate-400 dark:text-[#97A3B7]/78">
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

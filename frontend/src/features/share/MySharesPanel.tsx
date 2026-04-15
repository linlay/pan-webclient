import type { ReactNode } from "react";
import type { ManagedShare } from "@/types/contracts";
import { MaterialIcon } from "../shared/Icons";
import { formatDateTime } from "@/utils";
import { useTranslation } from "react-i18next";

export function MySharesPanel(props: {
	items: ManagedShare[];
	isMobile: boolean;
	deletingShareId: string | null;
	onBack: () => void;
	onCopy: (share: ManagedShare) => void;
	onDelete: (shareId: string) => void;
	onRefresh: () => void;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex h-full min-h-0 flex-col gap-5 p-5 text-body-text dark:text-[#f4f8ff]/92">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs uppercase tracking-wider text-slate-400 dark:text-[#97A3B7]/78">
						{t("shares.panelTitle")}
					</p>
					<h3 className="mt-1 text-[1.7rem] font-bold leading-none text-heading-text dark:text-white">
						{t("shares.panelTitle")}
					</h3>
				</div>
				{!props.isMobile ? (
					<div className="flex items-center gap-2">
						<button
							className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-[#97A3B7]/78 dark:hover:bg-night-2 dark:hover:text-white"
							onClick={props.onRefresh}
							type="button"
						>
							<MaterialIcon name="refresh" />
						</button>
						<button
							className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2"
							onClick={props.onBack}
							type="button"
						>
							{t("common.back")}
						</button>
					</div>
				) : null}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto pr-1">
				<div className="space-y-4">
					{props.items.length === 0 ? (
						<div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-12 text-center dark:border-white/10 dark:bg-night-2/48">
							<MaterialIcon
								name="share"
								className="mb-3 !text-5xl text-slate-300 dark:text-[#355078]"
							/>
							<p className="text-sm text-slate-500 dark:text-[#97A3B7]/78">
								{t("shares.emptyTitle")}
							</p>
							<p className="mt-1 text-xs text-slate-400 dark:text-[#8FA7CF]/70">
								{t("shares.emptyDescription")}
							</p>
						</div>
					) : (
						props.items.map((share) => {
							const deleting =
								props.deletingShareId === share.id;
							return (
								<div
									className="rounded-[28px] border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-night-1/96"
									key={share.id}
								>
									<div className="flex items-start gap-3">
										<div
											className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] ${
												share.isDir
													? "bg-primary/10 text-primary"
													: "bg-slate-100 text-slate-500 dark:bg-night-2 dark:text-[#c7d4eb]/78"
											}`}
										>
											<MaterialIcon
												name={share.isDir ? "folder" : "draft"}
												className="text-xl"
											/>
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">
												{share.name}
											</p>
											<p className="mt-1 break-all text-xs text-slate-400 dark:text-[#97A3B7]/78">
												{share.mountId}
												{share.path}
											</p>
										</div>
									</div>

									<div className="mt-4 flex flex-wrap gap-2">
										<Tag>
											{share.access === "password"
												? t("shares.access.password")
												: t("shares.access.public")}
										</Tag>
										<Tag>
											{share.permission === "write"
												? t("shares.permission.write")
												: t("shares.permission.read")}
										</Tag>
										{share.permission === "write" ? (
											<Tag>
												{share.writeMode === "text"
													? t("shares.writeMode.text")
													: t("shares.writeMode.local")}
											</Tag>
										) : null}
										<Tag>
											{share.isDir
												? t("shares.entryType.dir")
												: t("shares.entryType.file")}
										</Tag>
										{share.expired ? (
											<Tag tone="danger">
												{t("shares.status.expired")}
											</Tag>
										) : (
											<Tag tone="success">
												{t("shares.status.active")}
											</Tag>
										)}
									</div>

									<div className="mt-4 rounded-2xl bg-slate-50/90 px-4 py-3 dark:bg-night-2/92">
										<div className="grid gap-2 text-xs text-slate-500 dark:text-[#97A3B7]/78">
											<div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
												<span className="font-medium text-slate-400 dark:text-[#8FA7CF]/70">
													{t("shares.meta.created")}
												</span>
												<span className="min-w-0">
													{formatDateTime(share.createdAt)}
												</span>
											</div>
											<div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
												<span className="font-medium text-slate-400 dark:text-[#8FA7CF]/70">
													{t("shares.meta.expiry")}
												</span>
												<span className="min-w-0">
													{share.expiresAt > 0
														? formatDateTime(share.expiresAt)
														: t("shares.meta.never")}
												</span>
											</div>
										</div>
										{share.access === "password" ? (
											<p className="mt-3 text-xs text-amber-600 dark:text-amber-300">
												{share.password
													? t("shares.passwordHintSaved")
													: t("shares.passwordHintMissing")}
											</p>
										) : null}
									</div>

									<div className="mt-4 grid grid-cols-2 gap-2">
										<button
											className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-night-3/92 dark:text-[#d7e4fb]/82 dark:hover:bg-[#22365b]"
											onClick={() => void props.onCopy(share)}
											type="button"
										>
											<MaterialIcon
												name="content_copy"
												className="text-sm"
											/>
											{t("shares.copyLink")}
										</button>
										<button
											className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
											disabled={deleting}
											onClick={() => void props.onDelete(share.id)}
											type="button"
										>
											<MaterialIcon
												name={deleting ? "sync" : "link_off"}
												className={
													deleting
														? "text-sm animate-spin"
														: "text-sm"
												}
											/>
											{deleting
												? t("shares.revoking")
												: t("shares.revokeShare")}
										</button>
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
}

function Tag(props: {
	children: ReactNode;
	tone?: "default" | "success" | "danger";
}) {
	const tone =
		props.tone === "success"
			? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
			: props.tone === "danger"
				? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
				: "bg-white text-slate-500 dark:bg-night-3/92 dark:text-[#c7d4eb]/78";
	return (
		<span
			className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${tone}`}
		>
			{props.children}
		</span>
	);
}

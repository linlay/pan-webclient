import type { ReactNode } from "react";
import type { ManagedShare } from "@/types/contracts";
import { MaterialIcon } from "../shared/Icons";
import { formatDateTime } from "@/utils";

export function MySharesPanel(props: {
	items: ManagedShare[];
	isMobile: boolean;
	deletingShareId: string | null;
	onBack: () => void;
	onCopy: (share: ManagedShare) => void;
	onDelete: (shareId: string) => void;
	onRefresh: () => void;
}) {
	return (
		<div className="flex h-full min-h-0 flex-col gap-5 p-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs uppercase tracking-wider text-slate-400">
						My Shares
					</p>
					<h3 className="mt-1 text-[1.7rem] font-bold leading-none">
						我的分享
					</h3>
				</div>
				{!props.isMobile ? (
					<div className="flex items-center gap-2">
						<button
							className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
							onClick={props.onRefresh}
							type="button"
						>
							<MaterialIcon name="refresh" />
						</button>
						<button
							className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
							onClick={props.onBack}
							type="button"
						>
							返回
						</button>
					</div>
				) : null}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto pr-1">
				<div className="space-y-4">
					{props.items.length === 0 ? (
						<div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-800/30">
							<MaterialIcon
								name="share"
								className="mb-3 !text-5xl text-slate-300 dark:text-slate-600"
							/>
							<p className="text-sm text-slate-500 dark:text-slate-400">
								还没有创建过分享
							</p>
							<p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
								选中文件或目录后，点击工具栏里的分享即可生成短链。
							</p>
						</div>
					) : (
						props.items.map((share) => {
							const deleting =
								props.deletingShareId === share.id;
							return (
								<div
									className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/70"
									key={share.id}
								>
									<div className="flex items-start gap-3">
										<div
											className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] ${
												share.isDir
													? "bg-primary/10 text-primary"
													: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
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
											<p className="mt-1 break-all text-xs text-slate-400">
												{share.mountId}
												{share.path}
											</p>
										</div>
									</div>

									<div className="mt-4 flex flex-wrap gap-2">
										<Tag>
											{share.access === "password"
												? "密码分享"
												: "公开分享"}
										</Tag>
										<Tag>
											{share.permission === "write"
												? "写入分享"
												: "只读分享"}
										</Tag>
										{share.permission === "write" ? (
											<Tag>
												{share.writeMode === "text"
													? "文本输入"
													: "本地文件"}
											</Tag>
										) : null}
										<Tag>{share.isDir ? "目录" : "文件"}</Tag>
										{share.expired ? (
											<Tag tone="danger">已过期</Tag>
										) : (
											<Tag tone="success">生效中</Tag>
										)}
									</div>

									<div className="mt-4 rounded-2xl bg-slate-50/90 px-4 py-3 dark:bg-slate-800/50">
										<div className="grid gap-2 text-xs text-slate-500 dark:text-slate-400">
											<div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
												<span className="font-medium text-slate-400">
													创建
												</span>
												<span className="min-w-0">
													{formatDateTime(share.createdAt)}
												</span>
											</div>
											<div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
												<span className="font-medium text-slate-400">
													有效期
												</span>
												<span className="min-w-0">
													{share.expiresAt > 0
														? formatDateTime(share.expiresAt)
														: "永久有效"}
												</span>
											</div>
										</div>
										{share.access === "password" ? (
											<p className="mt-3 text-xs text-amber-600 dark:text-amber-300">
												{share.password
													? "复制链接时会自动附带提取码。"
													: "当前分享创建时未保存提取码，复制时仅包含链接。"}
											</p>
										) : null}
									</div>

									<div className="mt-4 grid grid-cols-2 gap-2">
										<button
											className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
											onClick={() => void props.onCopy(share)}
											type="button"
										>
											<MaterialIcon
												name="content_copy"
												className="text-sm"
											/>
											复制链接
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
											{deleting ? "取消中..." : "取消分享"}
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
				: "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300";
	return (
		<span
			className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${tone}`}
		>
			{props.children}
		</span>
	);
}

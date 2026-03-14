import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { MaterialIcon } from "@/features/shared/Icons";
import type {
	FileEntry,
	ShareAccess,
	ShareCreateResult,
	SharePermission,
	ShareWriteMode,
} from "@/types/contracts";
import {
	defaultShareCustomDate,
	describeShareExpiry,
	maxShareCustomDate,
	minShareCustomDate,
	resolveShareExpiryUnix,
	type ShareExpiryPreset,
} from "@/utils";

const expiryOptions: Array<{
	label: string;
	value: ShareExpiryPreset;
	description: string;
}> = [
	{ label: "7 天内有效", value: "7d", description: "适合短期临时分享" },
	{ label: "14 天内有效", value: "14d", description: "适合协作资料" },
	{ label: "30 天内有效", value: "30d", description: "默认推荐时长" },
	{ label: "永久有效", value: "permanent", description: "直到手动删除分享记录" },
	{ label: "自定义日期", value: "custom", description: "最多支持 365 天内日期" },
];

export function ShareDialog(props: {
	entry: FileEntry;
	onClose: () => void;
	onCreated?: () => void;
}) {
	const [access, setAccess] = useState<ShareAccess>("public");
	const [permission, setPermission] = useState<SharePermission>("read");
	const [writeMode, setWriteMode] = useState<ShareWriteMode>("local");
	const [expiryPreset, setExpiryPreset] =
		useState<ShareExpiryPreset>("30d");
	const [customDate, setCustomDate] = useState(defaultShareCustomDate);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState<ShareCreateResult | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		setAccess("public");
		setPermission("read");
		setWriteMode("local");
		setExpiryPreset("30d");
		setCustomDate(defaultShareCustomDate());
		setSubmitting(false);
		setError("");
		setResult(null);
		setCopied(false);
	}, [props.entry.mountId, props.entry.path]);

	useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), 1600);
		return () => window.clearTimeout(timer);
	}, [copied]);

	const shareLink = useMemo(() => {
		if (!result) return "";
		return new URL(result.urlPath, window.location.origin).toString();
	}, [result]);

	const shareCopyText = useMemo(() => {
		if (!result) return "";
		if (result.password) {
			return `链接：${shareLink}\n提取码：${result.password}`;
		}
		return `链接：${shareLink}`;
	}, [result, shareLink]);

	async function handleSubmit() {
		setSubmitting(true);
		setError("");
		try {
			const expiresAt = resolveShareExpiryUnix(expiryPreset, customDate);
			const next = await api.createShare(
				props.entry.mountId,
				props.entry.path,
				access,
				permission,
				writeMode,
				expiresAt,
			);
			setResult(next);
			props.onCreated?.();
		} catch (e) {
			setError(e instanceof Error ? e.message : "创建分享失败");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleCopy() {
		if (!shareCopyText) return;
		await navigator.clipboard.writeText(shareCopyText);
		setCopied(true);
	}

	return (
		<div
			className="modal-backdrop"
			onClick={() => {
				if (!submitting) props.onClose();
			}}
			role="presentation"
		>
			<div
				className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-fade-in"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_45%),linear-gradient(180deg,_rgba(248,250,252,0.95),_rgba(255,255,255,1))] px-6 py-5 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_45%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(15,23,42,1))]">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">
								Share
							</p>
							<h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
								分享 {props.entry.name}
							</h2>
							<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
								{props.entry.isDir
									? "为当前目录生成短链，并选择只读访问或目录写入权限。"
									: "为当前文件生成短链，访问者只能访问、保存和下载当前文件。"}
							</p>
						</div>
						<button
							className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
							onClick={props.onClose}
							type="button"
						>
							<MaterialIcon name="close" />
						</button>
					</div>
				</div>

				{result ? (
					<div className="space-y-5 px-6 py-6">
						<div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
									<MaterialIcon name="check_circle" className="text-xl" />
								</div>
								<div>
									<div className="font-semibold">分享已创建</div>
									<div className="text-sm opacity-80">
										{describeShareExpiry(result.expiresAt)}
									</div>
								</div>
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
							<div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
								<div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
									分享链接
								</div>
								<div className="mt-3 break-all rounded-xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
									{shareLink}
								</div>
								{result.password ? (
									<div className="mt-3 rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
										<div className="text-xs uppercase tracking-[0.2em] text-slate-400">
											提取码
										</div>
										<div className="mt-2 text-3xl font-black tracking-[0.35em] text-slate-900 dark:text-white">
											{result.password}
										</div>
									</div>
								) : null}
								<button
									className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
									onClick={() => void handleCopy()}
									type="button"
								>
									<MaterialIcon name="content_copy" className="text-sm" />
									{copied ? "已复制分享信息" : "复制链接"}
								</button>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
								<div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
									访问方式
								</div>
								<div className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
									{result.access === "password" ? "密码分享" : "公开分享"}
								</div>
								<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
									{result.access === "password"
										? "查看前需要输入 4 位提取码。"
										: "访问链接即可浏览当前分享内容。"}
								</p>
								<div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-800/50">
									<div className="text-xs uppercase tracking-[0.2em] text-slate-400">
										分享权限
									</div>
									<div className="mt-2 font-semibold text-slate-900 dark:text-white">
										{result.permission === "write"
											? "写入分享"
											: "只读分享"}
									</div>
									<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
										{result.permission === "write"
											? "访问者只能在当前目录及子目录内上传文件，不提供下载和转存。"
											: "访问者可浏览、下载并保存当前分享内容。"}
									</p>
									{result.permission === "write" ? (
										<div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
											<div className="text-xs uppercase tracking-[0.2em] text-slate-400">
												写入方式
											</div>
											<div className="mt-2 font-semibold text-slate-900 dark:text-white">
												{result.writeMode === "text"
													? "文本输入（仅 Markdown）"
													: "本地文件上传"}
											</div>
										</div>
									) : null}
								</div>
							</div>
						</div>

						<div className="flex justify-end">
							<button
								className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
								onClick={props.onClose}
								type="button"
							>
								完成
							</button>
						</div>
					</div>
				) : (
					<div className="space-y-6 px-6 py-6">
						<div className="grid gap-4 md:grid-cols-2">
							<button
								className={`rounded-2xl border px-4 py-4 text-left transition-all ${
									access === "public"
										? "border-primary bg-primary/5 shadow-sm"
										: "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
								}`}
								onClick={() => {
									setAccess("public");
									setError("");
								}}
								type="button"
							>
								<div className="flex items-center gap-3">
									<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
										<MaterialIcon name="open_in_new" className="text-xl" />
									</div>
									<div>
										<div className="font-semibold text-slate-900 dark:text-white">
											公开分享
										</div>
										<div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
											拿到链接即可直接访问
										</div>
									</div>
								</div>
							</button>

							<button
								className={`rounded-2xl border px-4 py-4 text-left transition-all ${
									access === "password"
										? "border-primary bg-primary/5 shadow-sm"
										: "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
								}`}
								onClick={() => {
									setAccess("password");
									setError("");
								}}
								type="button"
							>
								<div className="flex items-center gap-3">
									<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
										<MaterialIcon name="lock" className="text-xl" />
									</div>
									<div>
										<div className="font-semibold text-slate-900 dark:text-white">
											密码分享
										</div>
										<div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
											系统自动生成 4 位提取码
										</div>
									</div>
								</div>
							</button>
						</div>

						{props.entry.isDir ? (
							<div>
								<div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
									目录权限
								</div>
								<div className="grid gap-3 md:grid-cols-2">
									<button
										className={`rounded-2xl border px-4 py-4 text-left transition-all ${
											permission === "read"
												? "border-primary bg-primary/5 shadow-sm"
												: "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
										}`}
										onClick={() => {
											setPermission("read");
											setError("");
										}}
										type="button"
									>
										<div className="flex items-center gap-3">
											<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
												<MaterialIcon
													name="visibility"
													className="text-xl"
												/>
											</div>
											<div>
												<div className="font-semibold text-slate-900 dark:text-white">
													只读分享
												</div>
												<div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
													支持访问、下载和保存
												</div>
											</div>
										</div>
									</button>

									<button
										className={`rounded-2xl border px-4 py-4 text-left transition-all ${
											permission === "write"
												? "border-primary bg-primary/5 shadow-sm"
												: "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
										}`}
										onClick={() => {
											setPermission("write");
											setError("");
										}}
										type="button"
									>
										<div className="flex items-center gap-3">
											<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
												<MaterialIcon
													name="upload"
													className="text-xl"
												/>
											</div>
											<div>
												<div className="font-semibold text-slate-900 dark:text-white">
													写入分享
												</div>
												<div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
													仅开放目录上传，不提供下载和转存
												</div>
											</div>
										</div>
									</button>
								</div>
							</div>
						) : (
							<div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
								单文件分享固定为只读模式，不支持写入权限。
							</div>
						)}

						{props.entry.isDir && permission === "write" ? (
							<div>
								<div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
									写入方式
								</div>
								<div className="grid gap-3 md:grid-cols-2">
									<button
										className={`rounded-2xl border px-4 py-4 text-left transition-all ${
											writeMode === "local"
												? "border-primary bg-primary/5 shadow-sm"
												: "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
										}`}
										onClick={() => {
											setWriteMode("local");
											setError("");
										}}
										type="button"
									>
										<div className="flex items-center gap-3">
											<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
												<MaterialIcon name="upload" className="text-xl" />
											</div>
											<div>
												<div className="font-semibold text-slate-900 dark:text-white">
													本地文件
												</div>
												<div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
													访问者只能选择本地文件上传
												</div>
											</div>
										</div>
									</button>

									<button
										className={`rounded-2xl border px-4 py-4 text-left transition-all ${
											writeMode === "text"
												? "border-primary bg-primary/5 shadow-sm"
												: "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
										}`}
										onClick={() => {
											setWriteMode("text");
											setError("");
										}}
										type="button"
									>
										<div className="flex items-center gap-3">
											<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
												<MaterialIcon
													name="edit_note"
													className="text-xl"
												/>
											</div>
											<div>
												<div className="font-semibold text-slate-900 dark:text-white">
													文本输入
												</div>
												<div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
													访问者直接填写内容，保存为 `.md`
												</div>
											</div>
										</div>
									</button>
								</div>
							</div>
						) : null}

						<div>
							<div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
								有效期设置
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								{expiryOptions.map((option) => (
									<button
										className={`rounded-2xl border px-4 py-4 text-left transition-all ${
											expiryPreset === option.value
												? "border-primary bg-primary/5 shadow-sm"
												: "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
										}`}
										key={option.value}
										onClick={() => {
											setExpiryPreset(option.value);
											setError("");
										}}
										type="button"
									>
										<div className="font-semibold text-slate-900 dark:text-white">
											{option.label}
										</div>
										<div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
											{option.description}
										</div>
									</button>
								))}
							</div>
							{expiryPreset === "custom" ? (
								<div className="mt-4">
									<label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
										到期日期
									</label>
									<input
										className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800"
										max={maxShareCustomDate()}
										min={minShareCustomDate()}
										onChange={(e) => setCustomDate(e.target.value)}
										type="date"
										value={customDate}
									/>
								</div>
							) : null}
						</div>

						{error ? (
							<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
								{error}
							</div>
						) : null}

						<div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
							<button
								className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
								onClick={props.onClose}
								type="button"
							>
								取消
							</button>
							<button
								className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
								disabled={submitting}
								onClick={() => void handleSubmit()}
								type="button"
							>
								{submitting ? "创建中..." : "创建分享"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

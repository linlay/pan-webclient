import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { MaterialIcon } from "@/features/shared/Icons";
import type {
	FileEntry,
	ShareAccess,
	ShareCreateResult,
	SharePermission,
} from "@/types/contracts";

type ExpiryPreset = "7d" | "14d" | "30d" | "permanent" | "custom";

const expiryOptions: Array<{
	label: string;
	value: ExpiryPreset;
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
}) {
	const [access, setAccess] = useState<ShareAccess>("public");
	const [permission, setPermission] = useState<SharePermission>("read");
	const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>("30d");
	const [customDate, setCustomDate] = useState(defaultCustomDate);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState<ShareCreateResult | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		setAccess("public");
		setPermission("read");
		setExpiryPreset("30d");
		setCustomDate(defaultCustomDate());
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
			const expiresAt = resolveExpiryUnix(expiryPreset, customDate);
			const next = await api.createShare(
				props.entry.mountId,
				props.entry.path,
				access,
				permission,
				expiresAt,
			);
			setResult(next);
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
										{describeExpiry(result.expiresAt)}
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
										max={maxCustomDate()}
										min={minCustomDate()}
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

function resolveExpiryUnix(preset: ExpiryPreset, customDate: string) {
	if (preset === "permanent") {
		return 0;
	}
	if (preset === "custom") {
		if (!customDate) {
			throw new Error("请选择自定义到期日期。");
		}
		const next = new Date(`${customDate}T23:59:59`);
		if (Number.isNaN(next.getTime())) {
			throw new Error("自定义到期日期无效。");
		}
		return Math.floor(next.getTime() / 1000);
	}
	const days =
		preset === "7d" ? 7 : preset === "14d" ? 14 : 30;
	return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}

function describeExpiry(expiresAt: number) {
	if (!expiresAt) {
		return "当前分享永久有效";
	}
	return `当前分享将于 ${new Date(expiresAt * 1000).toLocaleString()} 到期`;
}

function defaultCustomDate() {
	const next = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
	return formatDateInput(next);
}

function minCustomDate() {
	return formatDateInput(new Date());
}

function maxCustomDate() {
	return formatDateInput(
		new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
	);
}

function formatDateInput(value: Date) {
	const year = value.getFullYear();
	const month = `${value.getMonth() + 1}`.padStart(2, "0");
	const day = `${value.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}

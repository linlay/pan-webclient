import { useEffect, useRef, useState } from "react";
import { WEB_UI_BASE } from "@/api/routing";
import { api } from "@/api";
import { SidebarTree } from "@/features/files/SidebarTree";
import { MaterialIcon } from "@/features/shared/Icons";
import type {
	FileEntry,
	FileTreeNode,
	MountRoot,
} from "@/types/contracts";
import { normalizeDirectory, pathLineage, treeCacheKey } from "@/utils";

export function ShareSaveDialog(props: {
	shareId: string;
	sourceName: string;
	sourcePath: string;
	onClose: () => void;
	onSaved: (entry: FileEntry, mount: MountRoot | null) => void;
}) {
	const [mounts, setMounts] = useState<MountRoot[]>([]);
	const [selectedMountId, setSelectedMountId] = useState("");
	const [targetDirInput, setTargetDirInput] = useState("/");
	const [treeCache, setTreeCache] = useState<Record<string, FileTreeNode[]>>(
		{},
	);
	const [expandedPaths, setExpandedPaths] = useState<string[]>(["/"]);
	const [loading, setLoading] = useState(true);
	const [authRequired, setAuthRequired] = useState(false);
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const loadedTreeKeysRef = useRef<Set<string>>(new Set());

	const normalizedTargetDir = normalizeDirectory(targetDirInput) || "/";
	const selectedMount =
		mounts.find((mount) => mount.id === selectedMountId) ?? null;

	useEffect(() => {
		void bootstrap();
	}, []);

	useEffect(() => {
		if (!selectedMountId || authRequired) return;
		void ensureTreeLoaded(selectedMountId, normalizedTargetDir).catch((e) => {
			setError(e instanceof Error ? e.message : "目录树加载失败");
		});
	}, [authRequired, normalizedTargetDir, selectedMountId]);

	async function bootstrap() {
		setLoading(true);
		setAuthRequired(false);
		setError("");
		try {
			await api.sessionMe();
		} catch {
			setAuthRequired(true);
			setError("请先在当前浏览器登录网盘后，再保存分享内容。");
			setLoading(false);
			return;
		}
		try {
			const nextMounts = await api.mounts();
			setMounts(nextMounts);
			const initialMountId = nextMounts[0]?.id ?? "";
			setSelectedMountId(initialMountId);
			if (!initialMountId) {
				setError("当前账号没有可用挂载点，暂时无法保存分享内容。");
			}
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: "可用挂载点加载失败",
			);
		} finally {
			setLoading(false);
		}
	}

	async function ensureTreeLoaded(mountId: string, path: string) {
		for (const item of pathLineage(path)) {
			const key = treeCacheKey(mountId, item, false);
			if (loadedTreeKeysRef.current.has(key)) {
				continue;
			}
			loadedTreeKeysRef.current.add(key);
			try {
				const nodes = await api.tree(mountId, item, false);
				setTreeCache((prev) => ({
					...prev,
					[key]: nodes,
				}));
			} catch {
				loadedTreeKeysRef.current.delete(key);
				throw new Error("目标目录树加载失败，请确认挂载目录可访问。");
			}
		}
	}

	async function handleToggle(path: string) {
		const expanded = expandedPaths.includes(path);
		setExpandedPaths((prev) =>
			expanded ? prev.filter((item) => item !== path) : [...prev, path],
		);
		if (!expanded) {
			try {
				await ensureTreeLoaded(selectedMountId, path);
			} catch (e) {
				setError(e instanceof Error ? e.message : "目录树加载失败");
			}
		}
	}

	async function handleSubmit() {
		if (!selectedMountId) {
			setError("请选择要保存到的挂载点。");
			return;
		}
		const targetDir = normalizeDirectory(targetDirInput);
		if (!targetDir) {
			setError("请输入目标目录。");
			return;
		}
		setSubmitting(true);
		setError("");
		try {
			const entry = await api.savePublicShare(
				props.shareId,
				props.sourcePath,
				selectedMountId,
				targetDir,
			);
			props.onSaved(entry, selectedMount);
		} catch (e) {
			const message =
				e instanceof Error ? e.message : "保存分享内容失败";
			setError(
				message.includes("please log in") ||
					message.includes("missing or invalid credentials")
					? "请先在当前浏览器登录网盘后，再保存分享内容。"
					: message,
			);
		} finally {
			setSubmitting(false);
		}
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
				className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-fade-in"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">
								Save Share
							</p>
							<h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
								保存到我的网盘
							</h2>
							<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
								把当前分享内容复制到你自己的挂载目录，不会扩大分享访问范围。
							</p>
						</div>
						<button
							className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
							onClick={props.onClose}
							type="button"
						>
							<MaterialIcon name="close" />
						</button>
					</div>
				</div>

				{loading ? (
					<div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
						正在检查登录状态并加载可用挂载点...
					</div>
				) : authRequired ? (
					<div className="space-y-5 px-6 py-8">
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
							<div className="flex items-start gap-3">
								<MaterialIcon name="lock" className="mt-0.5 text-xl" />
								<div>
									<div className="font-semibold">
										需要先登录后才能保存
									</div>
									<p className="mt-2 text-sm opacity-90">
										当前分享页是公开访问入口，保存到自己的网盘时会额外校验你的登录会话。
									</p>
								</div>
							</div>
						</div>

						{error ? (
							<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
								{error}
							</div>
						) : null}

						<div className="flex justify-end gap-3">
							<a
								className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
								href={WEB_UI_BASE}
								rel="noreferrer"
								target="_blank"
							>
								打开登录页
							</a>
							<button
								className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
								onClick={props.onClose}
								type="button"
							>
								关闭
							</button>
						</div>
					</div>
				) : (
					<div className="space-y-5 px-6 py-6">
						<div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/40">
							<div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
								当前保存项
							</div>
							<div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
								{props.sourceName}
							</div>
							<div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
								分享路径：{props.sourcePath}
							</div>
						</div>

						<div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
							<div className="space-y-4">
								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
										保存到挂载点
									</label>
									<select
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
										onChange={(e) => {
											setSelectedMountId(e.target.value);
											setTargetDirInput("/");
											setExpandedPaths(["/"]);
											setError("");
										}}
										value={selectedMountId}
									>
										{mounts.map((mount) => (
											<option key={mount.id} value={mount.id}>
												{mount.name}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
										目标目录
									</label>
									<input
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
										onBlur={() =>
											setTargetDirInput(
												normalizeDirectory(targetDirInput) || "/",
											)
										}
										onChange={(e) => setTargetDirInput(e.target.value)}
										placeholder="/"
										value={targetDirInput}
									/>
									<p className="mt-2 text-xs text-slate-400">
										可以直接输入路径，也可以从右侧目录树中选择。
									</p>
								</div>
							</div>

							<div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800">
								<div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:border-slate-800 dark:bg-slate-800/50">
									目标目录树
								</div>
								<div className="max-h-80 overflow-y-auto py-4">
									{selectedMount ? (
										<SidebarTree
											currentMountId={selectedMount.id}
											currentPath={normalizedTargetDir}
											expandedPaths={expandedPaths}
											mounts={[selectedMount]}
											onSelect={(_, path) => {
												setTargetDirInput(path);
												setExpandedPaths(pathLineage(path));
												setError("");
											}}
											onToggle={(_, path) => void handleToggle(path)}
											singleMountMode
											treeCache={treeCache}
											treeCacheKeySuffix="0"
										/>
									) : (
										<div className="px-4 py-12 text-center text-sm text-slate-400">
											暂无可选目标目录
										</div>
									)}
								</div>
							</div>
						</div>

						{error ? (
							<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
								{error}
							</div>
						) : null}

						<div className="flex justify-end gap-3">
							<button
								className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
								disabled={submitting}
								onClick={props.onClose}
								type="button"
							>
								取消
							</button>
							<button
								className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
								disabled={submitting || !selectedMountId}
								onClick={() => void handleSubmit()}
								type="button"
							>
								{submitting ? "保存中..." : "保存到网盘"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

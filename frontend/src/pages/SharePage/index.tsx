import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api";
import { uploadSizeErrorMessage } from "@/api/uploadLimits";
import { PreviewPane } from "@/features/preview/PreviewPane";
import { ShareSaveDialog } from "@/features/share/ShareSaveDialog";
import { MaterialIcon } from "@/features/shared/Icons";
import { useMediaQuery } from "@/utils";
import { MOBILE_MEDIA_QUERY } from "@/static";
import type {
	FileEntry,
	MountRoot,
	PreviewMeta,
	PublicShare,
} from "@/types/contracts";

export function SharePage(props: { shareId: string }) {
	const [share, setShare] = useState<PublicShare | null>(null);
	const [entries, setEntries] = useState<FileEntry[]>([]);
	const [currentPath, setCurrentPath] = useState("/");
	const [activePreview, setActivePreview] = useState<PreviewMeta | null>(
		null,
	);
	const [activeEntry, setActiveEntry] = useState<FileEntry | null>(null);
	const [loading, setLoading] = useState(true);
	const [submittingPassword, setSubmittingPassword] = useState(false);
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [notice, setNotice] = useState<string | null>(null);
	const [saveDialogOpen, setSaveDialogOpen] = useState(false);
	const [mobilePropertiesOpen, setMobilePropertiesOpen] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState({
		loaded: 0,
		total: 0,
	});
	const uploadInputRef = useRef<HTMLInputElement | null>(null);
	const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);

	useEffect(() => {
		void loadShare();
	}, [props.shareId]);

	useEffect(() => {
		if (!notice) return;
		const timer = window.setTimeout(() => setNotice(null), 1800);
		return () => window.clearTimeout(timer);
	}, [notice]);

	const breadcrumbs = useMemo(
		() => buildShareBreadcrumbs(currentPath),
		[currentPath],
	);
	const currentDownloadPath =
		activePreview?.kind === "directory"
			? activePreview.path
			: (activePreview?.path ?? currentPath);
	const activeFilePreview =
		activePreview?.kind && activePreview.kind !== "directory"
			? activePreview
			: null;
	const activeFileEntry =
		activeEntry && !activeEntry.isDir ? activeEntry : null;
	const currentSaveName = activeFileEntry?.name ?? share?.name ?? "当前分享";
	const canReadShare = share?.permission !== "write";
	const canUploadToShare = Boolean(share?.isDir && share?.permission === "write");
	const showMobilePropertiesPage =
		isMobile &&
		canReadShare &&
		Boolean(activeFilePreview) &&
		(mobilePropertiesOpen || !share?.isDir);

	useEffect(() => {
		if (!isMobile) {
			setMobilePropertiesOpen(false);
			return;
		}
		if (!share?.isDir && activeFilePreview) {
			setMobilePropertiesOpen(true);
		}
	}, [activeFilePreview, isMobile, share?.isDir]);

	async function loadShare() {
		setLoading(true);
		setError("");
		try {
			const payload = await api.publicShare(props.shareId);
			setShare(payload);
			if (!payload.authorized) {
				setEntries([]);
				setActivePreview(null);
				setActiveEntry(null);
				setCurrentPath("/");
				setMobilePropertiesOpen(false);
				return;
			}
			if (payload.preview) {
				setActivePreview(payload.preview);
				setActiveEntry(entryFromPreview(payload.preview));
				if (payload.preview.kind === "directory") {
					setCurrentPath(payload.preview.path);
					setEntries(payload.entries ?? []);
					setMobilePropertiesOpen(false);
				} else {
					setCurrentPath("/");
					setEntries([]);
					setMobilePropertiesOpen(isMobile);
				}
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "分享加载失败");
		} finally {
			setLoading(false);
		}
	}

	async function openDirectory(path: string) {
		try {
			const [preview, nextEntries] = await Promise.all([
				api.publicSharePreview(props.shareId, path),
				api.publicShareFiles(props.shareId, path),
			]);
			setCurrentPath(path);
			setEntries(nextEntries);
			setActivePreview(preview);
			setActiveEntry(entryFromPreview(preview));
			setMobilePropertiesOpen(false);
			setError("");
		} catch (e) {
			setError(e instanceof Error ? e.message : "目录加载失败");
		}
	}

	async function previewFile(path: string) {
		try {
			const next = await api.publicSharePreview(props.shareId, path);
			setActivePreview(next);
			setActiveEntry(entryFromPreview(next));
			if (isMobile) {
				setMobilePropertiesOpen(true);
			}
			setError("");
		} catch (e) {
			setError(e instanceof Error ? e.message : "文件预览失败");
		}
	}

	async function handlePasswordSubmit() {
		setSubmittingPassword(true);
		setError("");
		try {
			await api.authorizeShare(props.shareId, password.trim());
			setPassword("");
			await loadShare();
		} catch (e) {
			setError(e instanceof Error ? e.message : "密码校验失败");
		} finally {
			setSubmittingPassword(false);
		}
	}

	async function handleCopyLink() {
		await navigator.clipboard.writeText(window.location.href);
		setNotice("链接已复制");
	}

	async function handleShareUpload(files: FileList | null) {
		if (!files || !canUploadToShare) return;
		const uploadFiles = Array.from(files);
		const uploadError = uploadSizeErrorMessage(uploadFiles);
		if (uploadError) {
			setError(uploadError);
			return;
		}
		setUploading(true);
		setUploadProgress({ loaded: 0, total: 0 });
		setError("");
		try {
			const uploaded = await api.publicShareUpload(
				props.shareId,
				currentPath,
				uploadFiles,
				(progress) => setUploadProgress(progress),
			);
			await openDirectory(currentPath);
			setNotice(
				uploaded.length > 1
					? `已上传 ${uploaded.length} 个文件`
					: `已上传 ${uploaded[0]?.name ?? uploadFiles[0]?.name ?? "文件"}`,
			);
		} catch (e) {
			setError(e instanceof Error ? e.message : "上传失败");
		} finally {
			setUploading(false);
			setUploadProgress({ loaded: 0, total: 0 });
			if (uploadInputRef.current) {
				uploadInputRef.current.value = "";
			}
		}
	}

	async function handleEntryOpen(entry: FileEntry) {
		if (entry.isDir) {
			await openDirectory(entry.path);
			return;
		}
		if (!canReadShare) {
			setNotice("写入分享不支持文件预览或下载");
			return;
		}
		await previewFile(entry.path);
	}

	function handleSaved(entry: FileEntry, mount: MountRoot | null) {
		setSaveDialogOpen(false);
		setNotice(
			mount
				? `已保存到 ${mount.name}${entry.path}`
				: `已保存 ${entry.name}`,
		);
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-slate-100 px-4 py-20 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
				<div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200 bg-white px-8 py-16 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
					<div className="text-sm uppercase tracking-[0.25em] text-slate-400">
						Loading
					</div>
					<div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
						正在载入分享内容
					</div>
				</div>
			</div>
		);
	}

	if (error && !share) {
		return (
			<div className="min-h-screen bg-slate-100 px-4 py-20 dark:bg-slate-950">
				<div className="mx-auto max-w-xl rounded-[32px] border border-slate-200 bg-white px-8 py-14 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10">
						<MaterialIcon name="error" className="text-3xl" />
					</div>
					<div className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
						无法访问此分享
					</div>
					<p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
						{error}
					</p>
				</div>
			</div>
		);
	}

	if (!share?.authorized) {
		return (
			<div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,#f8fafc,#e2e8f0)] px-4 py-20 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_35%),linear-gradient(180deg,#020617,#0f172a)]">
				<div className="mx-auto max-w-xl rounded-[32px] border border-slate-200 bg-white/95 px-8 py-12 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
						<MaterialIcon name="lock" className="text-3xl" />
					</div>
					<div className="mt-5 text-center">
						<div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
							Password Share
						</div>
						<h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
							此分享已受密码保护
						</h1>
						<p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
							{share?.permission === "write"
								? "输入 4 位提取码后，才能进入当前目录并上传文件。"
								: "输入 4 位提取码后，才能浏览和下载被分享的文件或目录。"}
						</p>
						{share?.expiresAt ? (
							<p className="mt-2 text-xs text-slate-400">
								到期时间：
								{new Date(
									share.expiresAt * 1000,
								).toLocaleString()}
							</p>
						) : null}
					</div>

					<div className="mt-8">
						<label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
							提取码
						</label>
						<input
							autoFocus
							className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-black tracking-[0.45em] text-slate-900 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
							maxLength={4}
							onChange={(e) =>
								setPassword(
									e.target.value
										.replace(/\D/g, "")
										.slice(0, 4),
								)
							}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									void handlePasswordSubmit();
								}
							}}
							placeholder="0000"
							type="password"
							value={password}
						/>
					</div>

					{error ? (
						<div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
							{error}
						</div>
					) : null}

					<button
						className="mt-6 w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={submittingPassword || password.length !== 4}
						onClick={() => void handlePasswordSubmit()}
						type="button"
					>
						{submittingPassword ? "验证中..." : "进入分享"}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="h-[100dvh] overflow-hidden bg-slate-100 dark:bg-slate-950">
			<div className="mx-auto flex h-full max-w-7xl flex-col px-3 py-3 sm:px-6 sm:py-5">
				<input
					className="hidden"
					multiple
					onChange={(event) => void handleShareUpload(event.target.files)}
					ref={uploadInputRef}
					type="file"
				/>
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-[32px]">
					<div
						className={`shrink-0 border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(248,250,252,1))] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_34%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(15,23,42,0.98))] ${
							isMobile ? "px-5 pb-5 pt-6" : "px-4 py-4 sm:px-6 sm:py-5"
						}`}
					>
						<div
							className={
								isMobile
									? "flex flex-col gap-5"
									: "flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
							}
						>
							<div className="min-w-0">
								<div
									className={`font-semibold uppercase text-sky-500 ${
										isMobile
											? "text-[11px] tracking-[0.42em]"
											: "text-xs tracking-[0.25em]"
									}`}
								>
									Shared Link
								</div>
								<h1
									className={`truncate font-bold text-slate-900 dark:text-white ${
										isMobile
											? "mt-3 text-[2.4rem] leading-none"
											: "mt-2 text-2xl sm:text-3xl"
									}`}
								>
									{share?.name}
								</h1>
								<div
									className={`flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 ${
										isMobile ? "mt-4" : "mt-3"
									}`}
								>
									<span
										className={`font-medium dark:bg-slate-800 ${
											isMobile
												? "rounded-full border border-white/80 bg-white/80 px-3.5 py-1.5 text-[13px] shadow-sm"
												: "rounded-full bg-slate-100 px-3 py-1"
										}`}
									>
										{share?.access === "password"
											? "密码分享"
											: "公开分享"}
									</span>
									<span
										className={`font-medium dark:bg-slate-800 ${
											isMobile
												? "rounded-full border border-white/80 bg-white/80 px-3.5 py-1.5 text-[13px] shadow-sm"
												: "rounded-full bg-slate-100 px-3 py-1"
										}`}
									>
										{share?.isDir ? "目录" : "文件"}
									</span>
									<span
										className={`font-medium dark:bg-slate-800 ${
											isMobile
												? "rounded-full border border-white/80 bg-white/80 px-3.5 py-1.5 text-[13px] shadow-sm"
												: "rounded-full bg-slate-100 px-3 py-1"
										}`}
									>
										{share?.permission === "write"
											? "写入分享"
											: "只读分享"}
									</span>
								</div>
								<div
									className={`text-sm text-slate-500 dark:text-slate-400 ${
										isMobile
											? "mt-4 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/70"
											: "mt-3"
									}`}
								>
									<div className="flex items-center gap-2">
										<MaterialIcon
											name="schedule"
											className="text-slate-400"
										/>
										<span>
											{share?.expiresAt
												? `到期于 ${new Date(
														share.expiresAt * 1000,
													).toLocaleString()}`
												: "永久有效"}
										</span>
									</div>
								</div>
							</div>

							<div
								className={
									isMobile
										? "grid w-full grid-cols-1 gap-3"
										: "grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end sm:gap-3"
								}
							>
								<button
									className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 ${
										isMobile
											? "bg-white/85 px-4 py-3 shadow-sm"
											: "px-4 py-2.5"
									}`}
									onClick={() => void handleCopyLink()}
									type="button"
								>
									<MaterialIcon
										name="content_copy"
										className="text-base"
									/>
									复制链接
								</button>
								{canReadShare ? (
									<>
										<button
											className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 ${
												isMobile
													? "bg-white/85 px-4 py-3 shadow-sm"
													: "px-4 py-2.5"
											}`}
											onClick={() => setSaveDialogOpen(true)}
											type="button"
										>
											<MaterialIcon
												name="cloud_done"
												className="text-base"
											/>
											保存到网盘
										</button>
										<a
											className={`flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-center text-sm font-semibold text-white transition-colors hover:bg-primary/90 ${
												isMobile
													? "py-3 shadow-lg shadow-primary/20"
													: "col-span-2 py-2.5 sm:col-span-1"
											}`}
											href={api.publicShareDownloadUrl(
												props.shareId,
												currentDownloadPath,
											)}
										>
											<MaterialIcon
												name="download"
												className="text-base"
											/>
											{activePreview?.kind === "directory"
												? "下载当前目录"
												: "下载当前文件"}
										</a>
									</>
								) : (
									<button
										className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 ${
											isMobile
												? "py-3 shadow-lg shadow-primary/20"
												: "col-span-2 py-2.5 sm:col-span-1"
										}`}
										disabled={uploading}
										onClick={() => uploadInputRef.current?.click()}
										type="button"
									>
										<MaterialIcon
											name={uploading ? "sync" : "upload"}
											className={uploading ? "animate-spin" : ""}
										/>
										{uploading
											? formatUploadProgress(uploadProgress)
											: "上传到当前目录"}
									</button>
								)}
							</div>
						</div>
					</div>

					{error ? (
						<div className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-5">
							<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
								{error}
							</div>
						</div>
					) : null}

					{isMobile ? (
						showMobilePropertiesPage ? (
							<div className="min-h-0 flex flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.96))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.98))]">
								<div className="flex items-center gap-3 border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
									{share?.isDir ? (
										<button
											className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
											onClick={() =>
												setMobilePropertiesOpen(false)
											}
											type="button"
										>
											<MaterialIcon
												name="arrow_back"
												className="text-lg"
											/>
										</button>
									) : null}
										<div className="min-w-0">
											<div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">
												File Details
											</div>
											<div className="mt-1 truncate text-base font-semibold text-slate-900 dark:text-white">
												{activeFilePreview?.name ?? share?.name}
											</div>
										</div>
									</div>
									<div className="min-h-0 flex-1 overflow-hidden">
									<PreviewPane
										activeEntry={activeFileEntry}
										canEdit={false}
										currentMount={null}
										currentPath={currentPath}
										onEnterEdit={() => {}}
										onImagePreview={() => {}}
										onShowTasks={() => {}}
										preview={activeFilePreview}
										searchQuery=""
										selectedEntries={[]}
										taskCount={0}
										/>
									</div>
								</div>
							) : (
							<div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(241,245,249,0.88))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]">
								<div className="shrink-0 px-5 pt-4">
									<div className="overflow-x-auto pb-1">
										<div className="flex min-w-max items-center gap-2 pr-1 text-sm text-slate-500 dark:text-slate-400">
											{breadcrumbs.map((crumb, index) => (
												<button
													className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium shadow-sm transition-colors ${
														crumb.path === currentPath
															? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
															: "border-white/80 bg-white/85 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
													}`}
													key={crumb.path}
													onClick={() =>
														void openDirectory(
															crumb.path,
														)
													}
													type="button"
												>
													{index === 0
														? "根目录"
														: crumb.label}
												</button>
											))}
										</div>
									</div>
								</div>

									{share?.isDir ? (
										<div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-4">
											<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/85 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
												<div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:border-slate-800 dark:bg-slate-800/70">
													<span>当前目录</span>
												<span>{entries.length} 项</span>
											</div>
											<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
												{entries.length === 0 ? (
													<div className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-sm text-slate-400 dark:bg-slate-800/60">
														当前目录为空
													</div>
												) : (
													<div className="space-y-2.5">
														{entries.map((entry) => {
															const selected =
																activePreview?.path ===
																entry.path;
															return (
																<button
																	className={`flex w-full items-center gap-3 rounded-[22px] px-4 py-3.5 text-left transition-all ${
																		selected
																			? "bg-primary/6 ring-1 ring-primary/10"
																			: "bg-slate-50/85 hover:bg-white dark:bg-slate-800/55 dark:hover:bg-slate-800"
																	}`}
																	key={`${entry.mountId}:${entry.path}`}
																	onClick={() =>
																		void handleEntryOpen(
																			entry,
																		)
																	}
																	type="button"
																>
																	<div
																		className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
																			entry.isDir
																				? "bg-primary/10 text-primary"
																				: "bg-slate-200/70 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300"
																		}`}
																	>
																		<MaterialIcon
																			name={
																				entry.isDir
																					? "folder"
																					: "draft"
																			}
																			className="text-xl"
																		/>
																	</div>
																	<div className="min-w-0 flex-1">
																		<div className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">
																			{entry.name}
																		</div>
																		<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
																			<span>
																				{entry.isDir
																					? "目录"
																					: formatBytes(
																							entry.size,
																						)}
																			</span>
																			<span>·</span>
																			<span>
																				{new Date(
																					entry.modTime *
																						1000,
																				).toLocaleString()}
																			</span>
																		</div>
																	</div>
																	<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm dark:bg-slate-900/80">
																		<MaterialIcon
																			name={
																				entry.isDir
																					? "chevron_right"
																					: canReadShare
																						? "chevron_right"
																						: "visibility_off"
																			}
																		/>
																	</div>
																</button>
															);
														})}
													</div>
												)}
											</div>
										</div>
									</div>
								) : (
									<div className="flex min-h-0 flex-1 items-center justify-center px-5 pb-5 pt-4">
										<div className="rounded-[28px] border border-slate-200 bg-white/85 px-5 py-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/80">
											<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
												<MaterialIcon
													name="description"
													className="text-2xl"
												/>
											</div>
											<div className="mt-4 text-base font-bold text-slate-900 dark:text-white">
												这是一个单文件分享
											</div>
											<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
												点击上方按钮可下载或保存，文件详情会单独展示。
											</p>
										</div>
									</div>
								)}
							</div>
						)
					) : (
						<div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
							<div className="flex min-h-0 flex-col border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
								<div className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
									<div className="overflow-x-auto pb-1">
										<div className="flex min-w-max items-center gap-2 pr-1 text-sm text-slate-500 dark:text-slate-400">
											{breadcrumbs.map((crumb, index) => (
												<button
													className={`rounded-full px-3 py-1 transition-colors ${
														crumb.path === currentPath
															? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
															: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
													}`}
													key={crumb.path}
													onClick={() =>
														void openDirectory(
															crumb.path,
														)
													}
													type="button"
												>
													{index === 0
														? "根目录"
														: crumb.label}
												</button>
											))}
										</div>
									</div>
								</div>

								{share?.isDir ? (
									<div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
										<div className="flex min-h-0 max-h-[32dvh] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 lg:max-h-none">
											<div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:border-slate-800 dark:bg-slate-800/50">
												<span>当前目录</span>
												<span>{entries.length} 项</span>
											</div>
											<div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain dark:divide-slate-800">
												{entries.length === 0 ? (
													<div className="px-4 py-12 text-center text-sm text-slate-400">
														当前目录为空
													</div>
												) : (
													entries.map((entry) => {
														const selected =
															activePreview?.path ===
															entry.path;
														return (
															<button
																className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
																	selected
																		? "bg-primary/5"
																		: "hover:bg-slate-50 dark:hover:bg-slate-800/60"
																}`}
																key={`${entry.mountId}:${entry.path}`}
																onClick={() =>
																	void handleEntryOpen(
																		entry,
																	)
																}
																type="button"
															>
																<div
																	className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
																		entry.isDir
																			? "bg-primary/10 text-primary"
																			: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
																	}`}
																>
																	<MaterialIcon
																		name={
																			entry.isDir
																				? "folder"
																				: "draft"
																		}
																		className="text-xl"
																	/>
																</div>
																<div className="min-w-0 flex-1">
																	<div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
																		{entry.name}
																	</div>
																	<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
																		<span>
																			{entry.isDir
																				? "目录"
																				: formatBytes(
																						entry.size,
																					)}
																		</span>
																		<span>·</span>
																		<span>
																			{new Date(
																				entry.modTime *
																					1000,
																			).toLocaleString()}
																		</span>
																	</div>
																</div>
																<MaterialIcon
																	name={
																		entry.isDir
																			? "chevron_right"
																			: canReadShare
																				? "open_in_new"
																				: "visibility_off"
																	}
																	className="text-slate-300"
																/>
															</button>
														);
													})
												)}
											</div>
										</div>
									</div>
								) : (
									<div className="shrink-0 px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
										<div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-8 text-center dark:border-slate-800 dark:bg-slate-800/40 sm:py-10">
											<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
												<MaterialIcon
													name="description"
													className="text-2xl"
												/>
											</div>
											<div className="mt-4 text-base font-bold text-slate-900 dark:text-white sm:text-lg">
												这是一个单文件分享
											</div>
											<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
												右侧可以直接预览或下载文件内容。
											</p>
										</div>
									</div>
								)}
							</div>

							<div className="min-h-0 flex-1 overflow-hidden border-t border-slate-200 dark:border-slate-800 lg:border-t-0">
								<div className="h-full overflow-hidden">
									{canUploadToShare ? (
										<div className="flex h-full min-h-0 items-center justify-center p-6">
											<div className="w-full max-w-md rounded-3xl border border-sky-200 bg-sky-50/80 px-6 py-8 dark:border-sky-500/20 dark:bg-sky-500/10">
												<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
													<MaterialIcon
														name="upload"
														className="text-2xl"
													/>
												</div>
												<div className="mt-4 text-center text-lg font-bold text-slate-900 dark:text-white">
													当前分享为目录写入模式
												</div>
												<p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
													可在当前目录及其子目录内上传文件，系统不会开放文件预览、下载和转存。
												</p>
												<div className="mt-5 rounded-2xl bg-white/80 px-4 py-4 text-sm text-slate-600 shadow-sm dark:bg-slate-900/60 dark:text-slate-300">
													当前上传目录：{currentPath}
												</div>
												<button
													className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
													disabled={uploading}
													onClick={() =>
														uploadInputRef.current?.click()
													}
													type="button"
												>
													<MaterialIcon
														name={
															uploading
																? "sync"
																: "upload"
														}
														className={
															uploading
																? "animate-spin"
																: ""
														}
													/>
													{uploading
														? formatUploadProgress(
																uploadProgress,
															)
														: "选择文件上传"}
												</button>
											</div>
										</div>
									) : activeFilePreview && activeFileEntry ? (
										<PreviewPane
											activeEntry={activeFileEntry}
											canEdit={false}
											currentMount={null}
											currentPath={currentPath}
											onEnterEdit={() => {}}
											onImagePreview={() => {}}
											onShowTasks={() => {}}
											preview={activeFilePreview}
											searchQuery=""
											selectedEntries={[]}
											taskCount={0}
										/>
									) : (
										<div className="flex h-full min-h-0 items-center justify-center p-6">
											<div className="max-w-sm rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
												<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
													<MaterialIcon
														name="description"
														className="text-2xl"
													/>
												</div>
											<div className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
												目录不展示 Properties
											</div>
												<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
													请选择左侧单个文件查看属性、预览和下载内容。
												</p>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{notice ? (
				<div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl dark:bg-white dark:text-slate-900">
					{notice}
				</div>
			) : null}

			{canReadShare && saveDialogOpen ? (
				<ShareSaveDialog
					onClose={() => setSaveDialogOpen(false)}
					onSaved={handleSaved}
					shareId={props.shareId}
					sourceName={currentSaveName}
					sourcePath={currentDownloadPath}
				/>
			) : null}
		</div>
	);
}

function entryFromPreview(preview: PreviewMeta): FileEntry {
	return {
		mountId: preview.mountId,
		path: preview.path,
		name: preview.name,
		isDir: preview.kind === "directory",
		size: preview.size,
		modTime: preview.modTime,
		mime: preview.mime,
		extension: "",
	};
}

function buildShareBreadcrumbs(path: string) {
	if (path === "/") {
		return [{ label: "/", path: "/" }];
	}
	const parts = path.split("/").filter(Boolean);
	let cursor = "";
	return [
		{ label: "/", path: "/" },
		...parts.map((part) => {
			cursor += `/${part}`;
			return { label: part, path: cursor };
		}),
	];
}

function formatBytes(value: number) {
	if (value < 1024) return `${value} B`;
	if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
	if (value < 1024 * 1024 * 1024)
		return `${(value / 1024 / 1024).toFixed(1)} MB`;
	return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatUploadProgress(progress: { loaded: number; total: number }) {
	if (progress.total > 0) {
		return `上传中 ${Math.min(
			100,
			Math.round((progress.loaded / progress.total) * 100),
		)}%`;
	}
	if (progress.loaded > 0) {
		return `已上传 ${formatBytes(progress.loaded)}`;
	}
	return "上传中...";
}

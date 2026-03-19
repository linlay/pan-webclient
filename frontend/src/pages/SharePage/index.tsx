import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api";
import { uploadSizeErrorMessage } from "@/api/uploadLimits";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ShareSaveDialog } from "@/features/share/ShareSaveDialog";
import { MOBILE_MEDIA_QUERY } from "@/static";
import {
	basename,
	buildShareTextFilename,
	dirname,
	entryFromPreview,
	formatUploadProgress,
	useMediaQuery,
} from "@/utils";
import type {
	FileEntry,
	MountRoot,
	PreviewMeta,
	PublicShare,
} from "@/types/contracts";
import { SharePageContent } from "./SharePageContent";
import { SharePageHeader } from "./SharePageHeader";
import {
	ShareErrorState,
	ShareLoadingState,
	SharePasswordGate,
} from "./SharePageStates";

export function SharePage(props: { shareId: string }) {
	const [share, setShare] = useState<PublicShare | null>(null);
	const [entries, setEntries] = useState<FileEntry[]>([]);
	const [sessionUploadedEntries, setSessionUploadedEntries] = useState<
		FileEntry[]
	>([]);
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
	const [sessionUsername, setSessionUsername] = useState("");
	const [textFileName, setTextFileName] = useState("");
	const [textFileContent, setTextFileContent] = useState("");
	const [savingTextFile, setSavingTextFile] = useState(false);
	const uploadInputRef = useRef<HTMLInputElement | null>(null);
	const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);

	useEffect(() => {
		void loadShare();
	}, [props.shareId]);

	useEffect(() => {
		setSessionUploadedEntries([]);
	}, [props.shareId]);

	useEffect(() => {
		let cancelled = false;
		void api
			.sessionMe()
			.then((me) => {
				if (!cancelled) {
					setSessionUsername(me.username.trim());
				}
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!notice) return;
		const timer = window.setTimeout(() => setNotice(null), 1800);
		return () => window.clearTimeout(timer);
	}, [notice]);

	function buildFallbackUploadedEntries(files: File[]): FileEntry[] {
		const currentTime = Math.floor(Date.now() / 1000);
		return files.map((file) => {
			const extension = file.name.includes(".")
				? (file.name.split(".").pop()?.toLowerCase() ?? "")
				: "";
			return {
				extension,
				isDir: false,
				mime: file.type,
				modTime: currentTime,
				mountId: "",
				name: file.name,
				path:
					currentPath === "/"
						? `/${file.name}`
						: `${currentPath}/${file.name}`,
				size: file.size,
			};
		});
	}

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
	const canUploadToShare = Boolean(
		share?.isDir && share?.permission === "write",
	);
	const isTextWriteMode = canUploadToShare && share?.writeMode === "text";
	const parentPath = useMemo(() => dirname(currentPath), [currentPath]);
	const defaultTextFileName = sessionUsername || "guest";
	const shareWriteBusy = uploading || savingTextFile;
	const currentDirectoryTitle =
		share?.authorized && share.isDir
			? currentPath === "/"
				? share.name
				: basename(currentPath)
			: null;
	const currentWriteActionLabel = isTextWriteMode
		? savingTextFile
			? "保存中..."
			: "保存 Markdown 到当前目录"
		: uploading
			? formatUploadProgress(uploadProgress)
			: "上传到当前目录";
	const showMobilePropertiesPage =
		isMobile &&
		canReadShare &&
		Boolean(activeFilePreview) &&
		(mobilePropertiesOpen || !share?.isDir);
	const hideMobileReadonlyHeader = showMobilePropertiesPage && canReadShare;

	useDocumentTitle(currentDirectoryTitle);

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
			setSessionUploadedEntries((prev) => [
				...(uploaded.length > 0
					? uploaded
					: buildFallbackUploadedEntries(uploadFiles)),
				...prev,
			]);
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

	async function handleCreateShareTextFile() {
		if (!canUploadToShare) return;
		const filename = buildShareTextFilename(
			textFileName,
			defaultTextFileName,
		);
		const textFile = new File([textFileContent], filename, {
			type: "text/markdown;charset=utf-8",
		});
		setSavingTextFile(true);
		setError("");
		try {
			const uploaded = await api.publicShareUpload(
				props.shareId,
				currentPath,
				[textFile],
			);
			setSessionUploadedEntries((prev) => [
				...(uploaded.length > 0
					? uploaded
					: buildFallbackUploadedEntries([textFile])),
				...prev,
			]);
			setTextFileName("");
			setTextFileContent("");
			setNotice(`已保存 ${uploaded[0]?.name ?? filename}`);
		} catch (e) {
			setError(e instanceof Error ? e.message : "文本保存失败");
		} finally {
			setSavingTextFile(false);
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
		return <ShareLoadingState />;
	}

	if (error && !share) {
		return <ShareErrorState message={error} />;
	}

	if (!share?.authorized) {
		return (
			<SharePasswordGate
				error={error}
				onPasswordChange={setPassword}
				onSubmit={() => void handlePasswordSubmit()}
				password={password}
				share={share}
				submitting={submittingPassword}
			/>
		);
	}

	return (
		<div
			className={`bg-slate-100 dark:bg-slate-950 ${
				isMobile
					? "min-h-[100dvh] overflow-y-auto"
					: "h-[100dvh] overflow-hidden"
			}`}
		>
			<div
				className={`mx-auto flex max-w-7xl flex-col px-3 py-3 sm:px-6 sm:py-5 ${
					isMobile ? "min-h-[100dvh]" : "h-full"
				}`}
			>
				<input
					className="hidden"
					multiple
					onChange={(event) =>
						void handleShareUpload(event.target.files)
					}
					ref={uploadInputRef}
					type="file"
				/>
				<div
					className={`flex flex-col rounded-[28px] border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-[32px] ${
						isMobile
							? hideMobileReadonlyHeader
								? "min-h-0 flex-1 overflow-hidden"
								: "flex-1"
							: "min-h-0 flex-1 overflow-hidden"
					}`}
				>
					{hideMobileReadonlyHeader ? null : (
						<SharePageHeader
							activePreview={activePreview}
							canReadShare={canReadShare}
							currentDownloadPath={currentDownloadPath}
							currentWriteActionLabel={currentWriteActionLabel}
							isMobile={isMobile}
							isTextWriteMode={isTextWriteMode}
							onCopyLink={() => void handleCopyLink()}
							onOpenSaveDialog={() => setSaveDialogOpen(true)}
							onPrimaryWriteAction={() => {
								if (isTextWriteMode) {
									void handleCreateShareTextFile();
									return;
								}
								uploadInputRef.current?.click();
							}}
							savingTextFile={savingTextFile}
							share={share}
							shareId={props.shareId}
							shareWriteBusy={shareWriteBusy}
							uploading={uploading}
						/>
					)}

					{error ? (
						<div className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-5">
							<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
								{error}
							</div>
						</div>
					) : null}

					<SharePageContent
						activeFileEntry={activeFileEntry}
						activeFilePreview={activeFilePreview}
						activePreviewPath={activePreview?.path ?? null}
						canReadShare={canReadShare}
						canUploadToShare={canUploadToShare}
						currentPath={currentPath}
						defaultTextFileName={defaultTextFileName}
						downloadHref={api.publicShareDownloadUrl(
							props.shareId,
							currentDownloadPath,
						)}
						entries={entries}
						isMobile={isMobile}
						isTextWriteMode={isTextWriteMode}
						onDismissMobileProperties={() =>
							setMobilePropertiesOpen(false)
						}
						onEntryOpen={(entry) => {
							void handleEntryOpen(entry);
						}}
						onGoBack={
							currentPath === "/"
								? undefined
								: () => {
										void openDirectory(parentPath);
									}
						}
						onPickLocalFile={() => uploadInputRef.current?.click()}
						onDropFiles={(files) => {
							void handleShareUpload(files);
						}}
						onSaveText={() => void handleCreateShareTextFile()}
						onTextContentChange={setTextFileContent}
						onTextFileNameChange={setTextFileName}
						savingTextFile={savingTextFile}
						sessionUploadedEntries={sessionUploadedEntries}
						share={share}
						showMobilePropertiesPage={showMobilePropertiesPage}
						textFileContent={textFileContent}
						textFileName={textFileName}
						uploadProgress={uploadProgress}
						uploading={uploading}
					/>
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

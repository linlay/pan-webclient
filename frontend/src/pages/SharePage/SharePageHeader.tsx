import { api } from "@/api";
import { MaterialIcon } from "@/features/shared/Icons";
import type { PreviewMeta, PublicShare } from "@/types/contracts";

export function SharePageHeader(props: {
	share: PublicShare;
	shareId: string;
	activePreview: PreviewMeta | null;
	currentDownloadPath: string;
	canReadShare: boolean;
	isMobile: boolean;
	shareWriteBusy: boolean;
	isTextWriteMode: boolean;
	savingTextFile: boolean;
	uploading: boolean;
	currentWriteActionLabel: string;
	onCopyLink: () => void;
	onOpenSaveDialog: () => void;
	onPrimaryWriteAction: () => void;
}) {
	const primaryActionIcon = props.isTextWriteMode
		? props.savingTextFile
			? "sync"
			: "save"
		: props.uploading
			? "sync"
			: "upload";
	const primaryActionSpinning =
		(props.isTextWriteMode && props.savingTextFile) ||
		(!props.isTextWriteMode && props.uploading);

	return (
		<div
			className={`shrink-0 border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(248,250,252,1))] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_34%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(15,23,42,0.98))] ${
				props.isMobile ? "px-5 pb-5 pt-6" : "px-4 py-4 sm:px-6 sm:py-5"
			}`}
		>
			<div
				className={
					props.isMobile
						? "flex flex-col gap-5"
						: "flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
				}
			>
				<div className="min-w-0">
					<div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
						<div
							className={`font-semibold uppercase text-sky-500 ${
								props.isMobile
									? "text-[11px] tracking-[0.42em]"
									: "text-xs tracking-[0.25em]"
							}`}
						>
							Shared Link
						</div>
						<ShareHeaderTag isMobile={props.isMobile}>
							{props.share.permission === "write"
								? "写入"
								: "只读"}
						</ShareHeaderTag>
					</div>

					<h1
						className={`truncate font-bold text-slate-900 dark:text-white ${
							props.isMobile
								? "mt-3 text-[1.5rem] leading-none"
								: "mt-2 text-2xl sm:text-3xl"
						}`}
					>
						{props.share.name}
					</h1>
					{/* <div
						className={`flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 ${
							props.isMobile ? "mt-4" : "mt-3"
						}`}
					>
						<ShareHeaderTag isMobile={props.isMobile}>
							{props.share.permission === "write"
								? "写入分享"
								: "只读分享"}
						</ShareHeaderTag>
					</div> */}
					<div
						className={`text-sm text-slate-500 dark:text-slate-400 ${
							props.isMobile
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
								{props.share.expiresAt
									? `到期于 ${new Date(
											props.share.expiresAt * 1000,
										).toLocaleString()}`
									: "永久有效"}
							</span>
						</div>
					</div>
				</div>

				{props.canReadShare ? (
					<div
						className={
							props.isMobile
								? "grid w-full grid-cols-1 gap-3"
								: "grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end sm:gap-3"
						}
					>
						<a
							className={`flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-center text-sm font-semibold text-white transition-colors hover:bg-primary/90 ${
								props.isMobile
									? "py-3 shadow-lg shadow-primary/20"
									: "col-span-2 py-2.5 sm:col-span-1"
							}`}
							href={api.publicShareDownloadUrl(
								props.shareId,
								props.currentDownloadPath,
							)}
						>
							<MaterialIcon
								name="download"
								className="text-base"
							/>
							{props.activePreview?.kind === "directory"
								? "下载当前目录"
								: "下载当前文件"}
						</a>
					</div>
				) : null}
			</div>
		</div>
	);
}

function ShareHeaderTag(props: {
	children: React.ReactNode;
	isMobile: boolean;
}) {
	return (
		<span
			className={`font-medium dark:bg-slate-800 ${
				props.isMobile
					? "rounded-full border border-white/80 bg-white/80 px-3.5 py-1.5 text-[13px] shadow-sm"
					: "rounded-full bg-slate-100 px-3 py-1"
			}`}
		>
			{props.children}
		</span>
	);
}

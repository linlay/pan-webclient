import { MaterialIcon } from "@/features/shared/Icons";
import type { PublicShare } from "@/types/contracts";
import { formatDateTime } from "@/utils";
import { useTranslation } from "react-i18next";

export function ShareLoadingState() {
	const { t } = useTranslation();
	return (
		<div className="min-h-screen bg-slate-100 px-4 py-20 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
			<div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200 bg-white px-8 py-16 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
				<div className="text-sm uppercase tracking-[0.25em] text-slate-400">
					{t("common.processing")}
				</div>
				<div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
					{t("sharePage.loadingTitle")}
				</div>
			</div>
		</div>
	);
}

export function ShareErrorState(props: { message: string }) {
	const { t } = useTranslation();
	return (
		<div className="min-h-screen bg-slate-100 px-4 py-20 dark:bg-slate-950">
			<div className="mx-auto max-w-xl rounded-[32px] border border-slate-200 bg-white px-8 py-14 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10">
					<MaterialIcon name="error" className="text-3xl" />
				</div>
				<div className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
					{t("sharePage.errorTitle")}
				</div>
				<p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
					{props.message}
				</p>
			</div>
		</div>
	);
}

export function SharePasswordGate(props: {
	share: PublicShare;
	password: string;
	submitting: boolean;
	error: string;
	onPasswordChange: (value: string) => void;
	onSubmit: () => void;
}) {
	const { t } = useTranslation();
	const uploadTargetName =
		props.share.writeMode === "local" &&
		props.share.name &&
		props.share.name !== t("sharePage.passwordGate.protectedShareName")
			? props.share.name
			: "";

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,#f8fafc,#e2e8f0)] px-4 py-20 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_35%),linear-gradient(180deg,#020617,#0f172a)]">
			<div className="mx-auto max-w-xl rounded-[32px] border border-slate-200 bg-white/95 px-8 py-12 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
					<MaterialIcon name="lock" className="text-3xl" />
				</div>
				<div className="mt-5 text-center">
					<div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
						{t("sharePage.passwordShareEyebrow")}
					</div>
					<h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
						{t("sharePage.passwordProtectedTitle")}
					</h1>
					<p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
						{props.share.permission === "write" ? (
							props.share.writeMode === "text" ? (
								t("sharePage.passwordGate.textWrite")
							) : (
								<>
									{t("sharePage.passwordGate.localWritePrefix")}
									{uploadTargetName ? (
										<span className="mx-1 inline-flex items-center rounded-full px-1 py-1 text-sm font-semibold text-sky-700  dark:text-sky-200">
											{uploadTargetName}
										</span>
									) : (
										t("sharePage.passwordGate.currentFolder")
									)}
									{t("sharePage.passwordGate.localWriteSuffix")}
								</>
							)
						) : (
							t("sharePage.passwordGate.readOnly")
						)}
					</p>
					{props.share.expiresAt ? (
						<p className="mt-2 text-xs text-slate-400">
							{t("sharePage.expireAt", {
								value: formatDateTime(props.share.expiresAt),
							})}
						</p>
					) : null}
				</div>

				<div className="mt-8">
					<label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
						{t("sharePage.passwordPrompt")}
					</label>
					<input
						autoFocus
						className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-black tracking-[0.45em] text-slate-900 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
						maxLength={4}
						onChange={(event) =>
							props.onPasswordChange(
								event.target.value
									.replace(/\D/g, "")
									.slice(0, 4),
							)
						}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								props.onSubmit();
							}
						}}
						placeholder="0000"
						type="password"
						value={props.password}
					/>
				</div>

				{props.error ? (
					<div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
						{props.error}
					</div>
				) : null}

				<button
					className="mt-6 w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={props.submitting || props.password.length !== 4}
					onClick={props.onSubmit}
					type="button"
				>
					{props.submitting
						? t("sharePage.passwordValidating")
						: t("sharePage.enterShare")}
				</button>
			</div>
		</div>
	);
}

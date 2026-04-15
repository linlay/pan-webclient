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
import { useTranslation } from "react-i18next";

export function ShareSaveDialog(props: {
	shareId: string;
	sourceName: string;
	sourcePath: string;
	onClose: () => void;
	onSaved: (entry: FileEntry, mount: MountRoot | null) => void;
}) {
	const { t } = useTranslation();
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
			setError(
				e instanceof Error
					? e.message
					: t("controller.errors.operationFailed"),
			);
		});
	}, [authRequired, normalizedTargetDir, selectedMountId, t]);

	async function bootstrap() {
		setLoading(true);
		setAuthRequired(false);
		setError("");
		try {
			await api.sessionMe();
		} catch {
			setAuthRequired(true);
			setError(t("shares.saveDialog.authRequiredDescription"));
			setLoading(false);
			return;
		}
		try {
			const nextMounts = await api.mounts();
			setMounts(nextMounts);
			const initialMountId = nextMounts[0]?.id ?? "";
			setSelectedMountId(initialMountId);
			if (!initialMountId) {
				setError(t("controller.errors.noMountAvailable"));
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : t("controller.errors.operationFailed"));
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
				throw new Error(t("controller.errors.loadDirectoryFailed"));
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
				setError(e instanceof Error ? e.message : t("controller.errors.operationFailed"));
			}
		}
	}

	async function handleSubmit() {
		if (!selectedMountId) {
			setError(t("shares.saveDialog.noTargetDirectory"));
			return;
		}
		const targetDir = normalizeDirectory(targetDirInput);
		if (!targetDir) {
			setError(t("controller.errors.enterTargetDir"));
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
				e instanceof Error ? e.message : t("controller.errors.operationFailed");
			setError(
				message.includes("please log in") ||
					message.includes("missing or invalid credentials")
					? t("shares.saveDialog.authRequiredDescription")
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
				className="animate-fade-in max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-x-hidden overflow-y-auto overscroll-contain rounded-[28px] border border-slate-200 bg-white dark:border-white/10 dark:bg-night-0/98"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border-b border-slate-200 px-6 py-5 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(11,102,252,0.16),_transparent_45%),linear-gradient(180deg,_rgba(9,18,33,0.98),_rgba(15,23,42,1))]">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">
								{t("common.save")}
							</p>
							<h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
								{t("shares.saveDialog.title")}
							</h2>
							<p className="mt-2 text-sm text-slate-500 dark:text-[#97A3B7]/78">
								{t("shares.saveDialog.description")}
							</p>
						</div>
						<button
							className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-[#97A3B7]/78 dark:hover:bg-night-2 dark:hover:text-white"
							onClick={props.onClose}
							type="button"
						>
							<MaterialIcon name="close" />
						</button>
					</div>
				</div>

				{loading ? (
					<div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-[#97A3B7]/78">
						{t("shares.saveDialog.checkingSession")}
					</div>
				) : authRequired ? (
					<div className="space-y-5 px-6 py-8">
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
							<div className="flex items-start gap-3">
								<MaterialIcon name="lock" className="mt-0.5 text-xl" />
								<div>
									<div className="font-semibold">
										{t("shares.saveDialog.authRequiredTitle")}
									</div>
									<p className="mt-2 text-sm opacity-90">
										{t("shares.saveDialog.authRequiredDescription")}
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
								{t("shares.saveDialog.openLoginPage")}
							</a>
							<button
								className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2"
								onClick={props.onClose}
								type="button"
							>
								{t("common.close")}
							</button>
						</div>
					</div>
				) : (
					<div className="space-y-5 px-6 py-6">
						<div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-night-2/96">
							<div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-[#97A3B7]/78">
								{t("shares.saveDialog.currentItem")}
							</div>
							<div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
								{props.sourceName}
							</div>
							<div className="mt-1 text-sm text-slate-500 dark:text-[#97A3B7]/78">
								{t("shares.saveDialog.sharePath", {
									path: props.sourcePath,
								})}
							</div>
						</div>

						<div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
							<div className="space-y-4">
								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700 dark:text-[#c7d4eb]/78">
										{t("shares.saveDialog.saveToMount")}
									</label>
									<select
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-night-2/96 dark:text-white dark:focus:border-dark-primary dark:focus:ring-dark-primary/20"
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
									<label className="mb-2 block text-sm font-medium text-slate-700 dark:text-[#c7d4eb]/78">
										{t("shares.saveDialog.targetDirectory")}
									</label>
									<input
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-night-2/96 dark:text-white dark:focus:border-dark-primary dark:focus:ring-dark-primary/20"
										onBlur={() =>
											setTargetDirInput(
												normalizeDirectory(targetDirInput) || "/",
											)
										}
										onChange={(e) => setTargetDirInput(e.target.value)}
										placeholder="/"
										value={targetDirInput}
									/>
									<p className="mt-2 text-xs text-slate-400 dark:text-[#8FA7CF]/70">
										{t("shares.saveDialog.targetDirectoryHelp")}
									</p>
								</div>
							</div>

							<div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10">
								<div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:border-white/10 dark:bg-night-1/96 dark:text-[#97A3B7]/78">
									{t("shares.saveDialog.targetDirectoryTree")}
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
										<div className="px-4 py-12 text-center text-sm text-slate-400 dark:text-[#97A3B7]/78">
											{t("shares.saveDialog.noTargetDirectory")}
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
								className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-[#c7d4eb]/78 dark:hover:bg-night-2"
								disabled={submitting}
								onClick={props.onClose}
								type="button"
							>
								{t("common.cancel")}
							</button>
							<button
								className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
								disabled={submitting || !selectedMountId}
								onClick={() => void handleSubmit()}
								type="button"
							>
								{submitting
									? t("shares.saveDialog.saveToDriveSaving")
									: t("shares.saveDialog.saveToDrive")}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

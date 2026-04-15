import { type FormEvent, useState } from "react";
import { MaterialIcon } from "@/features/shared/Icons";
import { useTranslation } from "react-i18next";

type ThemeMode = "system" | "light" | "dark";

export function LoginForm(props: {
	appMode?: boolean;
	desktopEmbeddedMode?: boolean;
	passwordLoginEnabled?: boolean;
	notice: { tone: "info" | "error"; text: string } | null;
	themeMode: ThemeMode;
	resolvedTheme: "light" | "dark";
	onLogin: (username: string, password: string) => Promise<void>;
	onThemeModeChange: (mode: ThemeMode) => void;
}) {
	const { t } = useTranslation();
	const [username, setUsername] = useState("admin");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const infoMessage = props.desktopEmbeddedMode
		? t("auth.desktopEmbedMessage")
		: props.appMode
			? t("auth.appModeMessage")
			: "";

	async function submit(event: FormEvent) {
		event.preventDefault();
		setLoading(true);
		setError("");
		try {
			await props.onLogin(username, password);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : t("auth.loginFailed"),
			);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="tencent-flat tencent-login-bg relative flex min-h-screen items-center justify-center overflow-hidden font-display">
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute left-8 top-8 hidden text-primary/10 lg:block">
					<MaterialIcon className="!text-[110px] rotate-12" name="hub" />
				</div>
				<div className="absolute -bottom-10 right-[-30px] hidden text-primary/[0.06] lg:block">
					<MaterialIcon
						className="!text-[340px] -rotate-[12deg]"
						name="cloud_queue"
					/>
				</div>
				<div className="absolute right-[-10%] top-[-10%] h-[420px] w-[420px] rounded-full bg-primary/5 blur-3xl" />
				<div className="absolute bottom-[-12%] left-[-12%] h-[520px] w-[520px] rounded-full bg-accent/5 blur-3xl" />
			</div>

			<div className="relative z-10 flex w-full flex-col items-center justify-center p-4">
				<div className="tencent-frosted-panel flex w-full max-w-[440px] flex-col overflow-hidden rounded-[8px] animate-fade-in">
					<div className="border-b border-white/50 px-10 pb-6 pt-10 text-center dark:border-white/10">
						<div className="flex flex-col items-center gap-4">
							<div className="flex h-14 w-14 items-center justify-center rounded-[2px] border border-white/70 bg-primary text-white dark:border-dark-primary/30 dark:bg-dark-primary">
								<MaterialIcon className="!text-3xl" name="cloud" />
							</div>
							<div className="flex flex-col gap-1">
								<h1 className="text-2xl font-bold tracking-tight text-heading-text dark:text-white">
									{t("auth.welcomeBack")}
								</h1>
								<p className="text-sm text-body-text/80 dark:text-[#c7d4eb]/78">
									{props.desktopEmbeddedMode
										? t("auth.desktopEmbedWaiting")
										: t("auth.enterCredentials")}
								</p>
							</div>
						</div>
					</div>

					<div className="px-10 py-6">
						{!props.passwordLoginEnabled ? (
							<div className="flex flex-col gap-4">
								<div className="rounded-[2px] border border-sidebar-border bg-panel-wash/80 px-4 py-4 text-sm text-body-text dark:border-white/10 dark:bg-night-2/96 dark:text-[#d7e4fb]/82">
									{infoMessage}
								</div>
								{props.notice ? (
									<div
										className={`rounded-[2px] px-4 py-3 text-sm ${
											props.notice.tone === "error"
												? "border border-red-200 bg-red-50 text-red-500 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
												: "border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
										}`}
									>
										{props.notice.text}
									</div>
								) : null}
							</div>
						) : (
							<form className="flex flex-col gap-5" onSubmit={submit}>
								<div className="flex flex-col gap-2">
									<label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-body-text dark:text-[#c7d4eb]/78">
										{t("auth.emailOrUsername")}
									</label>
									<div className="relative">
										<MaterialIcon
											className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-body-text/45 dark:text-[#97A3B7]/78"
											name="mail"
										/>
										<input
										className="w-full rounded-[2px] border border-sidebar-border bg-white/65 py-2.5 pl-11 pr-4 text-sm text-heading-text outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-white/10 dark:bg-night-3/96 dark:text-white dark:placeholder:text-[#97A3B7]/70 dark:focus:border-dark-primary dark:focus:ring-dark-primary/20"
											placeholder="name@company.com"
											type="text"
											value={username}
											onChange={(e) =>
												setUsername(e.target.value)
											}
										/>
									</div>
								</div>

								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-body-text dark:text-[#c7d4eb]/78">
											{t("auth.password")}
										</label>
									</div>
									<div className="relative">
										<MaterialIcon
											className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-body-text/45 dark:text-[#97A3B7]/78"
											name="lock"
										/>
										<input
										className="w-full rounded-[2px] border border-sidebar-border bg-white/65 py-2.5 pl-11 pr-12 text-sm text-heading-text outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-white/10 dark:bg-night-3/96 dark:text-white dark:placeholder:text-[#97A3B7]/70 dark:focus:border-dark-primary dark:focus:ring-dark-primary/20"
											placeholder="••••••••"
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) =>
												setPassword(e.target.value)
											}
										/>
										<button
											className="absolute right-3 top-1/2 -translate-y-1/2 text-body-text/45 transition-colors hover:text-primary dark:text-[#97A3B7]/78 dark:hover:text-[#78A9FF]"
											type="button"
											onClick={() =>
												setShowPassword(!showPassword)
											}
										>
											<MaterialIcon
												className="text-xl"
												name={
													showPassword
														? "visibility_off"
														: "visibility"
												}
											/>
										</button>
									</div>
								</div>

								{error ? (
									<div className="rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
										{error}
									</div>
								) : null}

								{!error && props.notice ? (
									<div
										className={`rounded-[2px] px-4 py-3 text-sm ${
											props.notice.tone === "error"
												? "border border-red-200 bg-red-50 text-red-500 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
												: "border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
										}`}
									>
										{props.notice.text}
									</div>
								) : null}

								<button
									className="mt-2 flex w-full items-center justify-center gap-2 rounded-[2px] border border-primary/20 bg-[linear-gradient(90deg,#0052D9,#4656FF)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50 dark:border-dark-primary/40 dark:bg-[linear-gradient(90deg,#0B66FC,#4958FF)]"
									disabled={loading}
									type="submit"
								>
									<span>
										{loading
											? t("auth.signingIn")
											: t("auth.signIn")}
									</span>
									{!loading && (
										<MaterialIcon className="text-lg" name="login" />
									)}
								</button>
							</form>
						)}
					</div>

					<div className="border-t border-white/50 bg-white/35 px-8 py-5 dark:border-white/10 dark:bg-night-0/92">
						<div className="flex items-center justify-center gap-3 text-xs">
							<button
								className={`rounded-[2px] border px-3 py-1.5 transition-colors ${
									props.themeMode === "system"
										? "border-primary/20 bg-primary/10 text-primary dark:border-dark-primary/35 dark:bg-dark-primary/18 dark:text-[#78A9FF]"
										: "border-transparent text-body-text/80 hover:bg-white/60 dark:text-[#c7d4eb]/78 dark:hover:bg-night-3"
								}`}
								onClick={() => props.onThemeModeChange("system")}
								type="button"
							>
								{t("header.systemTheme")}
							</button>
							<button
								className={`rounded-[2px] border px-3 py-1.5 transition-colors ${
									props.themeMode === "light"
										? "border-primary/20 bg-primary/10 text-primary dark:border-dark-primary/35 dark:bg-dark-primary/18 dark:text-[#78A9FF]"
										: "border-transparent text-body-text/80 hover:bg-white/60 dark:text-[#c7d4eb]/78 dark:hover:bg-night-3"
								}`}
								onClick={() => props.onThemeModeChange("light")}
								type="button"
							>
								{t("header.lightMode")}
							</button>
							<button
								className={`rounded-[2px] border px-3 py-1.5 transition-colors ${
									props.themeMode === "dark"
										? "border-primary/20 bg-primary/10 text-primary dark:border-dark-primary/35 dark:bg-dark-primary/18 dark:text-[#78A9FF]"
										: "border-transparent text-body-text/80 hover:bg-white/60 dark:text-[#c7d4eb]/78 dark:hover:bg-night-3"
								}`}
								onClick={() => props.onThemeModeChange("dark")}
								type="button"
							>
								{t("header.darkMode")}
							</button>
						</div>
					</div>
				</div>

				<div className="mt-8 flex flex-col items-center gap-4 text-body-text/60 dark:text-[#8FA7CF]/70">
					<p className="text-xs">© 2026 Zenmind Pan Inc. All rights reserved.</p>
				</div>
			</div>
		</div>
	);
}

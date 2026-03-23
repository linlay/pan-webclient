import { type FormEvent, useState } from "react";
import { MaterialIcon } from "@/features/shared/Icons";
import { useTranslation } from "react-i18next";

type ThemeMode = "system" | "light" | "dark";

export function LoginForm(props: {
	appMode?: boolean;
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
		<div className="bg-bg-light dark:bg-bg-dark min-h-screen flex items-center justify-center relative overflow-hidden font-display">
			{/* Background Decoration */}
			<div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
				<div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
				<div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
			</div>

			{/* Decorative Icons */}
			<div className="hidden lg:block absolute bottom-10 right-10 opacity-20 pointer-events-none">
				<MaterialIcon
					className="!text-[200px] text-primary"
					name="cloud_done"
				/>
			</div>
			<div className="hidden lg:block absolute top-10 left-10 opacity-10 pointer-events-none rotate-12">
				<MaterialIcon
					className="!text-[150px] text-primary"
					name="backup"
				/>
			</div>

			<div className="flex flex-col items-center justify-center p-4 z-10 w-full">
				<div className="flex flex-col max-w-[480px] w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
					{/* Header */}
					<div className="p-8 pb-4 text-center">
						<div className="flex flex-col items-center gap-4">
							<div className="w-12 h-12 bg-primary flex items-center justify-center rounded-xl text-white shadow-lg shadow-primary/30">
								<MaterialIcon
									className="!text-3xl"
									name="cloud"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
									{t("auth.welcomeBack")}
								</h1>
								<p className="text-slate-500 dark:text-slate-400 text-sm">
									{t("auth.enterCredentials")}
								</p>
							</div>
						</div>
					</div>

					{/* Form */}
					<div className="px-8 py-6">
						{props.appMode ? (
							<div className="flex flex-col gap-4">
								<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
									{t("auth.appModeMessage")}
								</div>
								{props.notice ? (
									<div
										className={`text-sm rounded-lg px-4 py-3 ${
											props.notice.tone === "error"
												? "text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
												: "text-green-600 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20"
										}`}
									>
										{props.notice.text}
									</div>
								) : null}
							</div>
						) : (
							<form
								className="flex flex-col gap-5"
								onSubmit={submit}
							>
								<div className="flex flex-col gap-2">
									<label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
										{t("auth.emailOrUsername")}
									</label>
									<div className="relative">
										<MaterialIcon
											className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl"
											name="mail"
										/>
										<input
											className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
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
									<div className="flex justify-between items-center">
										<label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
											{t("auth.password")}
										</label>
									</div>
									<div className="relative">
										<MaterialIcon
											className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl"
											name="lock"
										/>
										<input
											className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
											placeholder="••••••••"
											type={
												showPassword
													? "text"
													: "password"
											}
											value={password}
											onChange={(e) =>
												setPassword(e.target.value)
											}
										/>
										<button
											className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
									<div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-4 py-3">
										{error}
									</div>
								) : null}

								{!error && props.notice ? (
									<div
										className={`text-sm rounded-lg px-4 py-3 ${
											props.notice.tone === "error"
												? "text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
												: "text-green-600 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20"
										}`}
									>
										{props.notice.text}
									</div>
								) : null}

								<button
									className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
									disabled={loading}
									type="submit"
								>
									<span>
										{loading
											? t("auth.signingIn")
											: t("auth.signIn")}
									</span>
									{!loading && (
										<MaterialIcon
											className="text-lg"
											name="login"
										/>
									)}
								</button>
							</form>
						)}
					</div>

					{/* Footer */}
					<div className="px-8 pb-6">
						<div className="flex items-center justify-center gap-4 text-xs text-slate-400">
							<button
								className={`px-3 py-1.5 rounded-lg transition-colors ${props.themeMode === "system" ? "bg-primary/10 text-primary" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
								onClick={() =>
									props.onThemeModeChange("system")
								}
								type="button"
							>
								{t("header.systemTheme")}
							</button>
							<button
								className={`px-3 py-1.5 rounded-lg transition-colors ${props.themeMode === "light" ? "bg-primary/10 text-primary" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
								onClick={() => props.onThemeModeChange("light")}
								type="button"
							>
								{t("header.lightMode")}
							</button>
							<button
								className={`px-3 py-1.5 rounded-lg transition-colors ${props.themeMode === "dark" ? "bg-primary/10 text-primary" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
								onClick={() => props.onThemeModeChange("dark")}
								type="button"
							>
								{t("header.darkMode")}
							</button>
						</div>
					</div>
				</div>

				{/* App Footer Info */}
				<div className="mt-8 flex flex-col items-center gap-4 text-slate-500 dark:text-slate-400">
					<p className="text-xs">
						© 2026 Zenmind Pan Inc. All rights reserved.
					</p>
				</div>
			</div>
		</div>
	);
}

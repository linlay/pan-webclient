import { isAppMode } from "@/api/routing";
import { AppShell } from "@/app/AppShell";
import { useAppController } from "@/app/useAppController";
import { LoginForm } from "@/features/auth/LoginForm";
import { MaterialIcon } from "@/features/shared/Icons";

export function App() {
	const controller = useAppController();

	if (controller.loadingSession) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
				<div className="flex flex-col items-center gap-4">
					<div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white animate-pulse">
						<MaterialIcon name="cloud" />
					</div>
					<p className="text-slate-500 text-sm">
						正在连接你的工作区...
					</p>
				</div>
			</div>
		);
	}

	if (!controller.user) {
		return (
			<LoginForm
				appMode={isAppMode()}
				notice={controller.notice}
				onLogin={controller.handleLogin}
				onThemeModeChange={controller.setThemeMode}
				resolvedTheme={controller.resolvedTheme}
				themeMode={controller.themeMode}
			/>
		);
	}

	return <AppShell {...controller} />;
}

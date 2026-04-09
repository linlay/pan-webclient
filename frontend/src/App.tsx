import {
	isAppMode,
	isDesktopEmbeddedMode,
	shouldUsePasswordLogin,
} from "@/api/routing";
import { AppShell } from "@/app/AppShell";
import { useAppController } from "@/app/useAppController";
import { LoginForm } from "@/features/auth/LoginForm";
import { MaterialIcon } from "@/features/shared/Icons";
import { useTranslation } from "react-i18next";

export function App() {
	const controller = useAppController();
	const { t } = useTranslation();
	const appMode = isAppMode();
	const desktopEmbeddedMode = isDesktopEmbeddedMode();

	if (controller.loadingSession) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
				<div className="flex flex-col items-center gap-4">
					<div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white animate-pulse">
						<MaterialIcon name="cloud" />
					</div>
					<p className="text-slate-500 text-sm">
						{t("app.connectingWorkspace")}
					</p>
				</div>
			</div>
		);
	}

	if (!controller.user) {
		return (
			<LoginForm
				appMode={appMode}
				desktopEmbeddedMode={desktopEmbeddedMode}
				passwordLoginEnabled={shouldUsePasswordLogin({
					appMode,
					search: window.location.search,
				})}
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

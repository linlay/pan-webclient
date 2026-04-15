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
			<div className="tencent-flat tencent-login-bg min-h-screen flex items-center justify-center px-4">
				<div className="tencent-frosted-panel flex flex-col items-center gap-4 rounded-[8px] px-8 py-7 animate-fade-in">
					<div className="flex h-12 w-12 items-center justify-center rounded-[2px] border border-white/60 bg-primary text-white animate-pulse dark:border-dark-primary/30 dark:bg-dark-primary">
						<MaterialIcon name="cloud" />
					</div>
					<p className="text-body-text text-sm dark:text-[#c7d4eb]/78">
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

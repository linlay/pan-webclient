import { useTranslation } from "react-i18next";
import { getCurrentLanguage, setAppLanguage, supportedLanguages } from "@/i18n";
import { MaterialIcon } from "./Icons";
import { MenuButton } from "./MenuButton";

export function LanguageMenuButton(props: {
	align?: "left" | "right";
	buttonClassName?: string;
	compact?: boolean;
}) {
	const { t } = useTranslation();
	const currentLanguage = getCurrentLanguage();

	return (
		<MenuButton
			actions={supportedLanguages.map((item) => ({
				label: item.nativeLabel,
				disabled: currentLanguage === item.code,
				onSelect: () => void setAppLanguage(item.code),
			}))}
			align={props.align ?? "right"}
			buttonClassName={
				props.buttonClassName ??
				(props.compact
					? "rounded-[4px] border border-transparent p-2 text-body-text/70 transition-colors hover:bg-panel-wash hover:text-heading-text dark:text-[#97A3B7]/78 dark:hover:bg-night-3 dark:hover:text-[#f4f8ff]/88"
					: "rounded-[4px] border border-sidebar-border bg-white/72 px-3 py-2 text-sm font-medium text-body-text transition-colors hover:bg-panel-wash dark:border-white/10 dark:bg-night-2/78 dark:text-[#c7d4eb]/78 dark:hover:bg-night-3")
			}
			buttonContent={
				props.compact ? (
					<MaterialIcon name="translate" className="text-lg" />
				) : (
					<span className="inline-flex items-center gap-2">
						<MaterialIcon name="translate" className="text-base" />
						{currentLanguage === "zh-CN" ? t("common.chinese") : t("common.english")}
					</span>
				)
			}
			buttonLabel={t("languageMenu.buttonLabel")}
		/>
	);
}

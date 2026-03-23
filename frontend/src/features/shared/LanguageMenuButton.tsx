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
					? "rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
					: "rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800")
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

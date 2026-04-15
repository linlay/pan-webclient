import { MaterialIcon } from "@/features/shared/Icons";
import { MenuButton } from "@/features/shared/MenuButton";
import { useTranslation } from "react-i18next";

export interface MobileFABProps {
	onCreateFolder: () => void;
	onUploadClick: () => void;
}

export function MobileFAB(props: MobileFABProps) {
	const { t } = useTranslation();

	return (
		<div className="fixed bottom-6 right-6 z-40 lg:hidden">
			<MenuButton
				buttonContent={
					<MaterialIcon name="add" className="text-3xl block" />
				}
				buttonClassName="flex size-14 items-center justify-center rounded-full border border-primary bg-primary text-white transition-colors active:scale-90 hover:bg-primary-hover dark:border-dark-primary dark:bg-dark-primary dark:hover:bg-dark-link"
				align="right"
				actions={[
					{
						icon: <MaterialIcon name="create_new_folder" />,
						label: t("mobileFab.newFolder"),
						onSelect: props.onCreateFolder,
					},
					{
						icon: <MaterialIcon name="upload" />,
						label: t("mobileFab.uploadFile"),
						onSelect: props.onUploadClick,
					},
				]}
			/>
		</div>
	);
}

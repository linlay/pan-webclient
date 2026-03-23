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
				buttonClassName="size-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform hover:bg-primary"
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

import { MaterialIcon } from "@/features/shared/Icons";
import { MenuButton } from "@/features/shared/MenuButton";

export interface MobileFABProps {
	onCreateFolder: () => void;
	onUploadClick: () => void;
}

export function MobileFAB(props: MobileFABProps) {
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
						label: "New Folder",
						onSelect: props.onCreateFolder,
					},
					{
						icon: <MaterialIcon name="upload" />,
						label: "Upload File",
						onSelect: props.onUploadClick,
					},
				]}
			/>
		</div>
	);
}

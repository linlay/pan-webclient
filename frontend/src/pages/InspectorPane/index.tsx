import { EditorPane } from "@/features/editor/EditorPane";
import { PreviewPane } from "@/features/preview/PreviewPane";
import { TaskPanel } from "@/features/tasks/TaskPanel";
import { TrashPanel } from "@/features/tasks/TrashPanel";
import { InspectorMode } from "@/types/home";
import {
	FileEntry,
	MountRoot,
	EditorDocument,
	TransferTask,
	TrashItem,
} from "@/types/contracts";
import { api } from "@/api";

export interface InspectorPaneProps {
	activeEntry: FileEntry | null;
	canEditActiveEntry: boolean;
	currentMount: MountRoot | null;
	currentPath: string;
	editor: EditorDocument | null;
	handleDeleteTrash: (id: string) => void;
	handleOpenTask: (taskId: string) => Promise<void>;
	handleRestoreTrash: (id: string) => void;
	inspectorMode: InspectorMode;
	onBack: () => void;
	onEnterEdit: () => void;
	onRefreshTrash: () => void;
	onSaveEditor: (c: string) => Promise<void>;
	onShowTasks: () => void;
	preview: Awaited<ReturnType<typeof api.preview>> | null;
	searchQuery: string;
	selectedEntries: FileEntry[];
	setTaskPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
	taskPanelCollapsed: boolean;
	tasks: TransferTask[];
	trashItems: TrashItem[];
	onImagePreview?: (url: string) => void;
}

// ─── Inspector Pane Router ───
export function InspectorPane(props: InspectorPaneProps) {
	if (props.inspectorMode === "editor")
		return (
			<EditorPane
				activeEntry={props.activeEntry}
				editor={props.editor}
				onBack={props.onBack}
				onSave={props.onSaveEditor}
				selectionCount={props.selectedEntries.length}
			/>
		);
	if (props.inspectorMode === "tasks")
		return (
			<TaskPanel
				collapsed={props.taskPanelCollapsed}
				onBack={props.onBack}
				onOpenTask={(id) => void props.handleOpenTask(id)}
				onToggle={() => props.setTaskPanelCollapsed((p) => !p)}
				tasks={props.tasks}
			/>
		);
	if (props.inspectorMode === "trash")
		return (
			<TrashPanel
				items={props.trashItems}
				onBack={props.onBack}
				onDelete={props.handleDeleteTrash}
				onRefresh={props.onRefreshTrash}
				onRestore={props.handleRestoreTrash}
			/>
		);
	return (
		<PreviewPane
			activeEntry={props.activeEntry}
			canEdit={props.canEditActiveEntry}
			currentMount={props.currentMount}
			currentPath={props.currentPath}
			onEnterEdit={props.onEnterEdit}
			onShowTasks={props.onShowTasks}
			preview={props.preview}
			searchQuery={props.searchQuery}
			selectedEntries={props.selectedEntries}
			taskCount={props.tasks.length}
			onImagePreview={props.onImagePreview}
		/>
	);
}

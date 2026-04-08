import { EditorPane } from "@/features/editor/EditorPane";
import { PreviewPane } from "@/features/preview/PreviewPane";
import { MySharesPanel } from "@/features/share/MySharesPanel";
import { TaskPanel } from "@/features/tasks/TaskPanel";
import { TrashPanel } from "@/features/tasks/TrashPanel";
import { InspectorMode } from "@/types/home";
import {
	FileEntry,
	MountRoot,
	EditorDocument,
	ManagedShare,
	TransferTask,
	TrashItem,
} from "@/types/contracts";
import { api } from "@/api";

export interface InspectorPaneProps {
	activeEntry: FileEntry | null;
	canEditActiveEntry: boolean;
	currentMount: MountRoot | null;
	currentPath: string;
	handleCancelTask: (id: string) => void;
	editor: EditorDocument | null;
	handleDeleteTask: (id: string) => void;
	handleDeleteTrash: (id: string) => void;
	handleDeleteShare: (id: string) => void;
	handleOpenTask: (taskId: string) => Promise<void>;
	handleRestoreTrash: (id: string) => void;
	handleCopyShare: (share: ManagedShare) => void;
	isMobile: boolean;
	inspectorMode: InspectorMode;
	onBack: () => void;
	onEnterEdit: () => void;
	onRefreshShares: () => void;
	onRefreshTrash: () => void;
	onSaveEditor: (c: string) => Promise<void>;
	onShowTasks: () => void;
	preview: Awaited<ReturnType<typeof api.preview>> | null;
	searchQuery: string;
	selectedEntries: FileEntry[];
	shares: ManagedShare[];
	deletingShareId: string | null;
	setTaskPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
	taskPanelCollapsed: boolean;
	tasks: TransferTask[];
	trashItems: TrashItem[];
	onImagePreview?: (url: string) => void;
	onClosePreview?: () => void;
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
				onCancelTask={props.handleCancelTask}
				onDeleteTask={props.handleDeleteTask}
				isMobile={props.isMobile}
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
				isMobile={props.isMobile}
				onBack={props.onBack}
				onDelete={props.handleDeleteTrash}
				onRefresh={props.onRefreshTrash}
				onRestore={props.handleRestoreTrash}
			/>
		);
	if (props.inspectorMode === "shares")
		return (
			<MySharesPanel
				deletingShareId={props.deletingShareId}
				isMobile={props.isMobile}
				items={props.shares}
				onBack={props.onBack}
				onCopy={props.handleCopyShare}
				onDelete={props.handleDeleteShare}
				onRefresh={props.onRefreshShares}
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
			onClosePreview={props.onClosePreview}
			preview={props.preview}
			searchQuery={props.searchQuery}
			selectedEntries={props.selectedEntries}
			taskCount={props.tasks.length}
			onImagePreview={props.onImagePreview}
		/>
	);
}

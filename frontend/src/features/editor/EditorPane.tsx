import { useEffect, useState } from "react";
import type { EditorDocument, FileEntry } from "../../types/contracts/index";
import { emptyEditorDescription, emptyEditorTitle } from "@/utils";
import { useTranslation } from "react-i18next";

export function EditorPane(props: {
	editor: EditorDocument | null;
	activeEntry: FileEntry | null;
	selectionCount: number;
	onClose?: () => void;
	onSave: (content: string) => Promise<void>;
	onBack: () => void;
}) {
	const { t } = useTranslation();
	const [content, setContent] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		setContent(props.editor?.content ?? "");
		setError("");
	}, [props.editor]);

	if (!props.editor) {
		return (
			<div className="p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-bold">{t("editor.title")}</h3>
				</div>
					<div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
						<strong className="text-slate-600 dark:text-slate-300">
							{emptyEditorTitle(
								props.selectionCount,
								props.activeEntry,
							)}
						</strong>
						<p className="text-sm text-slate-500 mt-2">
							{emptyEditorDescription(
								props.selectionCount,
								props.activeEntry,
							)}
					</p>
				</div>
			</div>
		);
	}

	async function save() {
		setSaving(true);
		setError("");
		try {
			await props.onSave(content);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("editor.saveFailed"));
		} finally {
			setSaving(false);
		}
	}

	const lineCount = content.split("\n").length;

	return (
		<div className="p-6 flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-slate-400">
						{t("editor.title")}
					</p>
					<h3 className="text-lg font-bold">{props.editor.name}</h3>
				</div>
				<div className="flex items-center gap-2">
					<span className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
						{props.editor.language}
					</span>
					{props.onClose ? (
						<button
							className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
							onClick={props.onClose}
							type="button"
						>
							{t("common.close")}
						</button>
					) : null}
					<button
						className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
						onClick={props.onBack}
						type="button"
					>
						{t("common.back")}
					</button>
					<button
						className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
						onClick={() => void save()}
						type="button"
					>
						{saving ? t("common.saving") : t("common.save")}
					</button>
				</div>
			</div>

			<div className="flex gap-3 text-xs text-slate-400">
				<span>{t("editor.lineCount", { count: lineCount })}</span>
				<span>{t("editor.charCount", { count: content.length })}</span>
			</div>

			{error ? (
				<div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-4 py-3">
					{error}
				</div>
			) : null}

			<textarea
				className="editor-textarea"
				onChange={(e) => setContent(e.target.value)}
				spellCheck={false}
				value={content}
			/>
		</div>
	);
}

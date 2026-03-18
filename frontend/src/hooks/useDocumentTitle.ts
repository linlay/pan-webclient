import { useEffect } from "react";

const DEFAULT_DOCUMENT_TITLE = "Zenmind Pan";

function buildDocumentTitle(directoryName?: string | null) {
	const trimmedDirectoryName = directoryName?.trim();
	return trimmedDirectoryName
		? `${trimmedDirectoryName} - ${DEFAULT_DOCUMENT_TITLE}`
		: DEFAULT_DOCUMENT_TITLE;
}

export function useDocumentTitle(directoryName?: string | null) {
	useEffect(() => {
		document.title = buildDocumentTitle(directoryName);
	}, [directoryName]);
}

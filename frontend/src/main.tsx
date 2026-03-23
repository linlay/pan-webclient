import React from "react";
import ReactDOM from "react-dom/client";
import { loadUploadLimits } from "./api/uploadLimits";
import { App } from "./App";
import { shareIdFromPath } from "./api/routing";
import "./i18n";
import { SharePage } from "./pages/SharePage";
import "./styles/index.scss";

const shareId = shareIdFromPath(window.location.pathname);

function renderApp() {
	ReactDOM.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			{shareId ? <SharePage shareId={shareId} /> : <App />}
		</React.StrictMode>,
	);
}

void loadUploadLimits().finally(renderApp);

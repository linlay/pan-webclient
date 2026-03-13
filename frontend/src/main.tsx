import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { shareIdFromPath } from "./api/routing";
import { SharePage } from "./pages/SharePage";
import "./styles/index.scss";

const shareId = shareIdFromPath(window.location.pathname);

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		{shareId ? <SharePage shareId={shareId} /> : <App />}
	</React.StrictMode>,
);

const APP_ACCESS_TOKEN_STORAGE_KEY = "pan_app_access_token";

type RefreshReason = "missing" | "unauthorized";

type AppAuthBridge = {
	getAccessToken?: () => string | null | undefined;
	refreshAccessToken?:
		| ((reason: RefreshReason) => Promise<string | null | undefined>)
		| ((reason: RefreshReason) => string | null | undefined);
};

let tokenRefreshPromise: Promise<string | null> | null = null;

function readStoredToken(): string | null {
	try {
		const token = window.sessionStorage.getItem(APP_ACCESS_TOKEN_STORAGE_KEY);
		return token?.trim() || null;
	} catch {
		return null;
	}
}

function writeStoredToken(token: string | null) {
	try {
		if (token) {
			window.sessionStorage.setItem(APP_ACCESS_TOKEN_STORAGE_KEY, token);
			return;
		}
		window.sessionStorage.removeItem(APP_ACCESS_TOKEN_STORAGE_KEY);
	} catch {
		// Ignore storage errors in embedded contexts.
	}
}

function resolveWindowToken(): string | null {
	const globalToken =
		typeof window.__PAN_APP_ACCESS_TOKEN === "string"
			? window.__PAN_APP_ACCESS_TOKEN.trim()
			: "";
	return globalToken || null;
}

function getBridge(): AppAuthBridge | null {
	return window.panAppAuthBridge ?? null;
}

async function resolveBridgeToken(
	method: keyof AppAuthBridge,
	reason: RefreshReason,
): Promise<string | null> {
	const bridge = getBridge();
	let value: string | null | undefined;
	if (method === "refreshAccessToken") {
		const refresh = bridge?.refreshAccessToken;
		if (typeof refresh !== "function") {
			return null;
		}
		value = await refresh(reason);
	} else {
		const getter = bridge?.getAccessToken;
		if (typeof getter !== "function") {
			return null;
		}
		value = await getter();
	}
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getAppAccessToken(): string | null {
	return readStoredToken() ?? resolveWindowToken();
}

export async function refreshAppAccessToken(
	reason: RefreshReason,
): Promise<string | null> {
	if (tokenRefreshPromise) {
		return tokenRefreshPromise;
	}
	tokenRefreshPromise = (async () => {
		const refreshed =
			(await resolveBridgeToken("refreshAccessToken", reason)) ??
			(await resolveBridgeToken("getAccessToken", reason)) ??
			resolveWindowToken();
		writeStoredToken(refreshed);
		return refreshed;
	})().finally(() => {
		tokenRefreshPromise = null;
	});
	return tokenRefreshPromise;
}

const APP_ACCESS_TOKEN_STORAGE_KEY = "pan_app_access_token";
const POST_MESSAGE_REQUEST_TYPE = "zenmind:pan-app-auth:request";
const POST_MESSAGE_RESPONSE_TYPE = "zenmind:pan-app-auth:response";
const POST_MESSAGE_TIMEOUT_MS = 10_000;

type RefreshReason = "missing" | "unauthorized";

type AppAuthBridge = {
	getAccessToken?: () => string | null | undefined;
	refreshAccessToken?:
		| ((reason: RefreshReason) => Promise<string | null | undefined>)
		| ((reason: RefreshReason) => string | null | undefined);
};

let tokenRefreshPromise: Promise<string | null> | null = null;
let postMessageRequestCounter = 0;

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
	const appWindow = window as Window & {
		__PAN_APP_ACCESS_TOKEN?: string;
	};
	const globalToken =
		typeof appWindow.__PAN_APP_ACCESS_TOKEN === "string"
			? appWindow.__PAN_APP_ACCESS_TOKEN.trim()
			: "";
	return globalToken || null;
}

function getBridge(): AppAuthBridge | null {
	return (
		(window as Window & {
			panAppAuthBridge?: AppAuthBridge;
		}).panAppAuthBridge ?? null
	);
}

function nextRequestId(): string {
	const randomPart =
		typeof window.crypto?.randomUUID === "function"
			? window.crypto.randomUUID()
			: `${Date.now()}-${++postMessageRequestCounter}`;
	return `pan-auth-${randomPart}`;
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

async function resolvePostMessageToken(
	reason: RefreshReason,
	timeoutMs: number = POST_MESSAGE_TIMEOUT_MS,
): Promise<string | null> {
	if (
		window.parent === window ||
		typeof window.parent?.postMessage !== "function"
	) {
		return null;
	}

	return new Promise((resolve) => {
		const requestId = nextRequestId();
		let settled = false;
		const targetWindow = window.parent;

		const finalize = (token: string | null) => {
			if (settled) {
				return;
			}
			settled = true;
			window.removeEventListener("message", handleMessage);
			window.clearTimeout(timeoutId);
			resolve(token);
		};

		const handleMessage = (event: MessageEvent) => {
			if (event.source !== targetWindow) {
				return;
			}
			const payload = event.data as
				| {
						type?: string;
						requestId?: string;
						token?: string | null;
				  }
				| null;
			if (
				!payload ||
				payload.type !== POST_MESSAGE_RESPONSE_TYPE ||
				payload.requestId !== requestId
			) {
				return;
			}
			finalize(
				typeof payload.token === "string" && payload.token.trim()
					? payload.token.trim()
					: null,
			);
		};

		const timeoutId = window.setTimeout(() => finalize(null), timeoutMs);
		window.addEventListener("message", handleMessage);
		targetWindow.postMessage(
			{
				type: POST_MESSAGE_REQUEST_TYPE,
				requestId,
				action: "refreshAccessToken",
				reason,
			},
			"*",
		);
	});
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
			(await resolvePostMessageToken(reason)) ??
			resolveWindowToken();
		writeStoredToken(refreshed);
		return refreshed;
	})().finally(() => {
		tokenRefreshPromise = null;
	});
	return tokenRefreshPromise;
}

export const __testInternals = {
	resolvePostMessageToken,
};

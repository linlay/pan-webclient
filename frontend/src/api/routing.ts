const rawApiBase =
	typeof process.env.REACT_APP_API_BASE_URL === "string"
		? process.env.REACT_APP_API_BASE_URL.trim()
		: "";

export const API_BASE = rawApiBase.replace(/\/+$/, "");
export const WEB_UI_BASE = "/pan";
export const APP_UI_BASE = "/apppan";
export const WEB_API_BASE = "/pan/api";
export const APP_API_BASE = "/apppan/api";
export const CANONICAL_API_BASE = "/api";

export function isAppMode(pathname: string = window.location.pathname): boolean {
	return pathname === APP_UI_BASE || pathname.startsWith(`${APP_UI_BASE}/`);
}

export function uiBasePath(
	pathname: string = window.location.pathname,
): typeof WEB_UI_BASE | typeof APP_UI_BASE {
	return isAppMode(pathname) ? APP_UI_BASE : WEB_UI_BASE;
}

export function apiPrefix(
	pathname: string = window.location.pathname,
): typeof WEB_API_BASE | typeof APP_API_BASE {
	return isAppMode(pathname) ? APP_API_BASE : WEB_API_BASE;
}

export function apiPath(
	path: string,
	pathname: string = window.location.pathname,
): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	for (const prefix of [WEB_API_BASE, APP_API_BASE]) {
		if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
			return normalized;
		}
	}
	if (
		normalized === CANONICAL_API_BASE ||
		normalized.startsWith(`${CANONICAL_API_BASE}/`)
	) {
		return `${apiPrefix(pathname)}${normalized.slice(CANONICAL_API_BASE.length)}`;
	}
	return `${apiPrefix(pathname)}${normalized}`;
}

export function apiUrl(
	path: string,
	pathname: string = window.location.pathname,
): string {
	return `${API_BASE}${apiPath(path, pathname)}`;
}

export function resolveExternalUrl(
	path: string,
	pathname: string = window.location.pathname,
): string {
	const trimmed = path.trim();
	if (trimmed === "") {
		return trimmed;
	}
	if (/^[a-z]+:\/\//i.test(trimmed)) {
		return trimmed;
	}
	return apiUrl(trimmed, pathname);
}

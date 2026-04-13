import { getAppAccessToken, refreshAppAccessToken } from "./appAuth";
import { needsTokenAuth } from "./routing";

type XhrLike = Pick<XMLHttpRequest, "setRequestHeader" | "withCredentials">;

export async function buildRequestAuth(
	init?: RequestInit,
): Promise<{
	headers: Headers;
	credentials: RequestCredentials;
	tokenAuth: boolean;
}> {
	const tokenAuth = needsTokenAuth();
	const headers = new Headers(init?.headers ?? undefined);

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	if (tokenAuth) {
		let token = getAppAccessToken();
		if (!token) {
			token = await refreshAppAccessToken("missing");
		}
		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}
	}

	return {
		headers,
		credentials: tokenAuth ? "omit" : "include",
		tokenAuth,
	};
}

export async function shouldReplayWithFreshToken(
	status: number,
	tokenAuth: boolean,
	allowReplay: boolean,
): Promise<boolean> {
	if (status !== 401 || !tokenAuth || !allowReplay) {
		return false;
	}

	return Boolean(await refreshAppAccessToken("unauthorized"));
}

export function applyTokenAuthToUploadRequest(request: XhrLike): boolean {
	const tokenAuth = needsTokenAuth();
	request.withCredentials = !tokenAuth;

	if (tokenAuth) {
		const token = getAppAccessToken();
		if (token) {
			request.setRequestHeader("Authorization", `Bearer ${token}`);
		}
	}

	return tokenAuth;
}

// @ts-nocheck
import assert from "node:assert/strict";

class MemoryStorage {
	#store = new Map();

	getItem(key) {
		return this.#store.has(key) ? this.#store.get(key) : null;
	}

	setItem(key, value) {
		this.#store.set(key, String(value));
	}

	removeItem(key) {
		this.#store.delete(key);
	}
}

function createWindowStub() {
	return {
		location: {
			pathname: "/pan/",
			search: "",
		},
		localStorage: new MemoryStorage(),
		sessionStorage: new MemoryStorage(),
		parent: null,
		panAppAuthBridge: undefined,
		addEventListener() {},
		removeEventListener() {},
		setTimeout() {
			return 1;
		},
		clearTimeout() {},
	};
}

const windowStub = createWindowStub();
globalThis.window = windowStub;

async function main() {
	const {
		applyTokenAuthToUploadRequest,
		buildRequestAuth,
		shouldReplayWithFreshToken,
	} = await import("./requestAuth.ts");

	windowStub.location.search = "?desktopApp=1";
	windowStub.sessionStorage.setItem("pan_app_access_token", "desktop-token");
	const requestAuth = await buildRequestAuth();
	assert.equal(requestAuth.tokenAuth, true);
	assert.equal(requestAuth.credentials, "omit");
	assert.equal(
		requestAuth.headers.get("Authorization"),
		"Bearer desktop-token",
	);

	const requestHeaders = new Map();
	const uploadRequest = {
		withCredentials: true,
		setRequestHeader(name, value) {
			requestHeaders.set(name, value);
		},
	};
	applyTokenAuthToUploadRequest(uploadRequest);
	assert.equal(uploadRequest.withCredentials, false);
	assert.equal(requestHeaders.get("Authorization"), "Bearer desktop-token");

	windowStub.location.search = "";
	windowStub.location.pathname = "/pan/";
	windowStub.sessionStorage.removeItem("pan_app_access_token");
	windowStub.panAppAuthBridge = {
		refreshAccessToken(reason) {
			assert.equal(reason, "unauthorized");
			return "refreshed-token";
		},
	};
	assert.equal(await shouldReplayWithFreshToken(401, true, true), true);
	assert.equal(
		windowStub.sessionStorage.getItem("pan_app_access_token"),
		"refreshed-token",
	);
}

void main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

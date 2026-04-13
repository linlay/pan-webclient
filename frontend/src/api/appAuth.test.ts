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
	const listeners = new Set();
	const postedMessages = [];
	const timers = new Map();
	let nextTimerId = 1;
	const parentWindow = {
		postMessage(payload, targetOrigin) {
			postedMessages.push({ payload, targetOrigin });
		},
	};
	const windowStub = {
		location: {
			pathname: "/pan/",
			search: "?desktopApp=1",
		},
		crypto: {
			randomUUID: () => "test-request-id",
		},
		localStorage: new MemoryStorage(),
		sessionStorage: new MemoryStorage(),
		parent: parentWindow,
		addEventListener(type, handler) {
			if (type === "message") {
				listeners.add(handler);
			}
		},
		removeEventListener(type, handler) {
			if (type === "message") {
				listeners.delete(handler);
			}
		},
		setTimeout(callback) {
			const timerId = nextTimerId++;
			timers.set(timerId, callback);
			return timerId;
		},
		clearTimeout(timerId) {
			timers.delete(timerId);
		},
	};

	return {
		windowStub,
		postedMessages,
		dispatchMessage(payload) {
			for (const listener of listeners) {
				listener({
					data: payload,
					source: parentWindow,
					origin: "file://",
				});
			}
		},
		runAllTimers() {
			for (const [timerId, callback] of [...timers.entries()]) {
				timers.delete(timerId);
				callback();
			}
		},
	};
}

const { windowStub, postedMessages, dispatchMessage, runAllTimers } =
	createWindowStub();
globalThis.window = windowStub;

async function main() {
	const { __testInternals, getAppAccessToken, refreshAppAccessToken } =
		await import("./appAuth.ts");

	const tokenPromise = refreshAppAccessToken("missing");
	await Promise.resolve();
	await Promise.resolve();
	assert.equal(postedMessages.length, 1);
	assert.deepEqual(postedMessages[0].payload, {
		type: "zenmind:pan-app-auth:request",
		requestId: "pan-auth-test-request-id",
		action: "refreshAccessToken",
		reason: "missing",
	});
	dispatchMessage({
		type: "zenmind:pan-app-auth:response",
		requestId: "pan-auth-test-request-id",
		token: "  desktop-token  ",
	});
	assert.equal(await tokenPromise, "desktop-token");
	assert.equal(getAppAccessToken(), "desktop-token");

	const timeoutPromise = __testInternals.resolvePostMessageToken(
		"unauthorized",
		5,
	);
	assert.equal(postedMessages.length, 2);
	runAllTimers();
	assert.equal(await timeoutPromise, null);
}

void main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

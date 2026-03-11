// @ts-nocheck
import assert from "node:assert/strict";
import {
	APP_API_BASE,
	APP_UI_BASE,
	WEB_API_BASE,
	WEB_UI_BASE,
	apiPath,
	apiPrefix,
	resolveExternalUrl,
	isAppMode,
	uiBasePath,
} from "./routing.ts";

assert.equal(isAppMode("/pan/"), false);
assert.equal(uiBasePath("/pan/files"), WEB_UI_BASE);
assert.equal(apiPrefix("/pan/files"), WEB_API_BASE);
assert.equal(apiPath("/api/files", "/pan/files"), "/pan/api/files");
assert.equal(apiPath("/files", "/pan/files"), "/pan/api/files");

assert.equal(isAppMode("/apppan/"), true);
assert.equal(uiBasePath("/apppan/files"), APP_UI_BASE);
assert.equal(apiPrefix("/apppan/files"), APP_API_BASE);
assert.equal(apiPath("/api/files", "/apppan/files"), "/apppan/api/files");
assert.equal(apiPath("/files", "/apppan/files"), "/apppan/api/files");

assert.equal(apiPath("/pan/api/files", "/apppan/files"), "/pan/api/files");
assert.equal(apiPath("/apppan/api/files", "/pan/files"), "/apppan/api/files");
assert.equal(resolveExternalUrl("/api/files", "/pan/files"), "/pan/api/files");
assert.equal(resolveExternalUrl("/api/files", "/apppan/files"), "/apppan/api/files");
assert.equal(resolveExternalUrl("/pan/api/files", "/apppan/files"), "/pan/api/files");
assert.equal(resolveExternalUrl("https://example.com/a.png", "/pan/files"), "https://example.com/a.png");

// @ts-nocheck
import assert from "node:assert/strict";
import { setAppLanguage } from "../i18n.ts";
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  setMaxUploadBytes,
  uploadRequestErrorMessage,
  uploadSizeErrorMessage,
} from "./uploadLimits.ts";

await setAppLanguage("zh-CN");

assert.equal(MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_BYTES);
assert.equal(uploadSizeErrorMessage([{ size: MAX_UPLOAD_BYTES }]), null);
assert.equal(
  uploadSizeErrorMessage([{ size: MAX_UPLOAD_BYTES - 1 }, { size: 2 }]),
  "单次上传总大小不能超过 20 MB。",
);
assert.equal(
  uploadRequestErrorMessage(413, "Content Too Large", null, "<html></html>"),
  "单次上传总大小不能超过 20 MB。",
);
setMaxUploadBytes(7 * 1024 * 1024);
assert.equal(MAX_UPLOAD_BYTES, 7 * 1024 * 1024);
assert.equal(
  uploadSizeErrorMessage([{ size: MAX_UPLOAD_BYTES - 1 }, { size: 2 }]),
  "单次上传总大小不能超过 7 MB。",
);
setMaxUploadBytes(DEFAULT_MAX_UPLOAD_BYTES);

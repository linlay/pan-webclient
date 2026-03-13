// @ts-nocheck
import assert from "node:assert/strict";
import {
  MAX_UPLOAD_BYTES,
  uploadRequestErrorMessage,
  uploadSizeErrorMessage,
} from "./uploadLimits.ts";

assert.equal(uploadSizeErrorMessage([{ size: MAX_UPLOAD_BYTES }]), null);
assert.equal(
  uploadSizeErrorMessage([{ size: MAX_UPLOAD_BYTES - 1 }, { size: 2 }]),
  "单次上传总大小不能超过 500 MB。",
);
assert.equal(
  uploadRequestErrorMessage(413, "Content Too Large", null, "<html></html>"),
  "单次上传总大小不能超过 500 MB。",
);

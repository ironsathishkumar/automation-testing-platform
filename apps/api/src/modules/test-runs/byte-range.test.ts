import assert from "node:assert/strict";
import { test } from "node:test";
import { parseByteRange } from "./byte-range";

test("reads open, closed, and suffix ranges", () => {
  assert.deepEqual(parseByteRange("bytes=100-", 1000), { start: 100, end: 999 });
  assert.deepEqual(parseByteRange("bytes=0-499", 1000), { start: 0, end: 499 });
  assert.deepEqual(parseByteRange("bytes=900-5000", 1000), { start: 900, end: 999 });
  assert.deepEqual(parseByteRange("bytes=-200", 1000), { start: 800, end: 999 });
});

test("serves the whole file when there is no usable range", () => {
  assert.equal(parseByteRange(undefined, 1000), undefined);
  assert.equal(parseByteRange("bytes=-", 1000), undefined);
  assert.equal(parseByteRange("bytes=0-1,5-9", 1000), undefined);
});

test("rejects ranges past the end of the file", () => {
  assert.equal(parseByteRange("bytes=1000-", 1000), "unsatisfiable");
  assert.equal(parseByteRange("bytes=500-100", 1000), "unsatisfiable");
});

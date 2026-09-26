import assert from "node:assert/strict";
import test from "node:test";
import { matrixCombinations } from "./run-matrix";

test("a single browser stays one combination", () => {
  assert.deepEqual(matrixCombinations({ browser: "firefox" }), [{ browser: "firefox", viewport: undefined }]);
});

test("browsers and viewports expand to a matrix", () => {
  const combinations = matrixCombinations({
    browsers: ["chromium", "webkit"],
    viewports: [
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
    ],
  });
  assert.equal(combinations.length, 4);
  assert.deepEqual(combinations[0], { browser: "chromium", viewport: { width: 1280, height: 720 } });
  assert.deepEqual(combinations[3], { browser: "webkit", viewport: { width: 390, height: 844 } });
});

test("an empty plan config still queues one job", () => {
  assert.equal(matrixCombinations(undefined).length, 1);
});

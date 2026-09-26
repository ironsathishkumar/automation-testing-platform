import assert from "node:assert/strict";
import test from "node:test";
import { VISUAL_FAIL_RATIO, diffRatio } from "./visual.helpers";

test("a small pixel difference stays under the fail ratio", () => {
  const ratio = diffRatio(10, 1280, 720);
  assert.ok(ratio < VISUAL_FAIL_RATIO);
});

test("a large pixel difference fails the comparison", () => {
  const ratio = diffRatio(50_000, 1280, 720);
  assert.ok(ratio > VISUAL_FAIL_RATIO);
});

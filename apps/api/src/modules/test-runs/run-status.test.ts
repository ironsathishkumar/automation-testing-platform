import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeResults } from "./run-status";

describe("summarizeResults", () => {
  it("stays queued until a result exists", () => {
    assert.equal(summarizeResults([], 2).status, "queued");
  });

  it("is running while jobs are still pending", () => {
    assert.equal(summarizeResults(["passed"], 1).status, "running");
  });

  it("fails when any finished result failed and nothing is pending", () => {
    assert.equal(summarizeResults(["passed", "failed"], 0).status, "failed");
  });

  it("passes when every result passed or was skipped", () => {
    assert.equal(summarizeResults(["passed", "skipped"], 0).status, "passed");
  });

  it("is cancelled only when every result was cancelled", () => {
    assert.equal(summarizeResults(["cancelled", "cancelled"], 0).status, "cancelled");
  });
});

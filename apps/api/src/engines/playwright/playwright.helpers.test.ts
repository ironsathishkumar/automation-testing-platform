import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { boundedTimeout, uploadPath } from "./playwright.helpers";

describe("playwright helpers", () => {
  it("caps action timeouts", () => {
    assert.equal(boundedTimeout(500_000, 30_000), 120_000);
    assert.equal(boundedTimeout(undefined, 30_000), 30_000);
  });

  it("rejects upload paths that leave the run folder", () => {
    assert.throws(() => uploadPath("/tmp/run", "../../etc/passwd"));
  });
});

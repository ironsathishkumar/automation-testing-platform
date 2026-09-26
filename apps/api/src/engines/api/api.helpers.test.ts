import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyVariables, buildUrl, readJsonPath } from "./api.helpers";

describe("api helpers", () => {
  it("replaces named variables", () => {
    assert.equal(applyVariables("Bearer {{ TOKEN }}", { TOKEN: "abc" }), "Bearer abc");
  });

  it("adds query parameters to a base URL", () => {
    assert.equal(buildUrl("https://example.test/v1", "/items", { q: "a" }).toString(), "https://example.test/items?q=a");
  });

  it("reads a dotted JSON path", () => {
    assert.equal(readJsonPath({ user: { id: 4 } }, "user.id"), 4);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SECRET_MASK, mergeVariables } from "./secrets";
import { toResourceKey } from "./slug";

describe("toResourceKey", () => {
  it("builds a stable uppercase key", () => {
    assert.equal(toResourceKey("Checkout flow"), "CHECKOUT-FLOW");
  });

  it("falls back when the name has no usable characters", () => {
    assert.equal(toResourceKey("***"), "ITEM");
  });
});

describe("mergeVariables", () => {
  it("keeps a stored secret when the client sends the mask", () => {
    const merged = mergeVariables(
      [{ key: "TOKEN", value: "real-secret", isSecret: true }],
      [{ key: "TOKEN", value: SECRET_MASK, isSecret: true }],
    );
    assert.equal(merged[0]?.value, "real-secret");
  });

  it("replaces a secret when a new value is provided", () => {
    const merged = mergeVariables(
      [{ key: "TOKEN", value: "real-secret", isSecret: true }],
      [{ key: "TOKEN", value: "next-secret", isSecret: true }],
    );
    assert.equal(merged[0]?.value, "next-secret");
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import { loginUrl, safeNext } from "./redirect";

test("only same-app paths are used after sign-in", () => {
  assert.equal(safeNext("/projects/abc?tab=runs"), "/projects/abc?tab=runs");
  assert.equal(safeNext("https://evil.test"), "/dashboard");
  assert.equal(safeNext("//evil.test"), "/dashboard");
  assert.equal(safeNext("/\\evil.test"), "/dashboard");
  assert.equal(safeNext("/login"), "/dashboard");
  assert.equal(safeNext(null), "/dashboard");
});

test("login links carry the reason and the page to return to", () => {
  assert.equal(loginUrl("/projects/abc", "expired"), "/login?reason=expired&next=%2Fprojects%2Fabc");
  assert.equal(loginUrl("/dashboard"), "/login");
});

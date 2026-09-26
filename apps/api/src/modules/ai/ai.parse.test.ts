import assert from "node:assert/strict";
import test from "node:test";
import { aiSettings, parseModelJson } from "./ai.parse";

test("model JSON can be wrapped in a fence", () => {
  assert.deepEqual(parseModelJson('```json\n{"scenarios":[]}\n```'), { scenarios: [] });
});

test("AI stays unconfigured until an API key is set", () => {
  assert.equal(aiSettings({}), null);
  assert.throws(() => aiSettings({ AI_API_KEY: "secret", AI_BASE_URL: "http://example.test/v1" }));
});

import assert from "node:assert/strict";
import test from "node:test";
import { aiSettings, buildAiConnection, parseModelJson } from "./ai.parse";

test("model JSON can be wrapped in a fence", () => {
  assert.deepEqual(parseModelJson('```json\n{"scenarios":[]}\n```'), { scenarios: [] });
});

test("AI stays unconfigured until an API key is set", () => {
  assert.equal(aiSettings({}), null);
  assert.throws(() => aiSettings({ AI_API_KEY: "secret", AI_BASE_URL: "http://example.test/v1" }));
});

test("local providers work without a key, remote providers need one", () => {
  assert.equal(buildAiConnection({ baseUrl: "https://api.groq.com/openai/v1", model: "llama" }), null);
  const local = buildAiConnection({ baseUrl: "http://localhost:11434/v1", model: "llama3.2" });
  assert.equal(local?.endpoint, "http://localhost:11434/v1/chat/completions");
  assert.equal(local?.apiKey, "local");
});

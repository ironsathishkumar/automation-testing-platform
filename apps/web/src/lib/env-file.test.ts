import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEnvFile } from "./env-file";

test("parseEnvFile reads KEY=VALUE lines and flags secrets", () => {
  const result = parseEnvFile(
    [
      "# QA settings",
      "BASE_URL=https://qa.example.com",
      "export USER_EMAIL = asha@example.com",
      'USER_PASSWORD="p@ss # not a comment"',
      "API_TOKEN='abc123'",
      "TIMEOUT=30 # seconds",
      "REGION: ap-south-1",
      "",
    ].join("\n"),
  );
  assert.deepEqual(result.variables, [
    { key: "BASE_URL", value: "https://qa.example.com", isSecret: false },
    { key: "USER_EMAIL", value: "asha@example.com", isSecret: false },
    { key: "USER_PASSWORD", value: "p@ss # not a comment", isSecret: true },
    { key: "API_TOKEN", value: "abc123", isSecret: true },
    { key: "TIMEOUT", value: "30", isSecret: false },
    { key: "REGION", value: "ap-south-1", isSecret: false },
  ]);
  assert.deepEqual(result.skipped, []);
});

test("parseEnvFile skips invalid lines and keeps the last duplicate", () => {
  const result = parseEnvFile("just text\n1BAD=x\nNAME=first\r\nNAME=second\n=nokey");
  assert.deepEqual(result.variables, [{ key: "NAME", value: "second", isSecret: false }]);
  assert.deepEqual(result.skipped, [1, 2, 5]);
});

import assert from "node:assert/strict";
import test from "node:test";
import { appiumCapabilities, k6Profile, missingSecurityHeaders, safeFilter, safeHttpUrl } from "./advanced.helpers";

test("security header check names the headers a page is missing", () => {
  const headers = new Headers({ "x-content-type-options": "nosniff" });
  const missing = missingSecurityHeaders(new URL("https://example.test"), headers);
  assert.ok(missing.includes("referrer-policy"));
  assert.ok(missing.includes("strict-transport-security"));
});

test("database filters reject operators", () => {
  assert.throws(() => safeFilter({ $gt: 1 }), /not allowed/);
  assert.deepEqual(safeFilter({ status: "ready" }), { status: "ready" });
});

test("k6 profiles stay inside the local limits", () => {
  const profile = k6Profile({ vus: 500, seconds: 900, url: "https://example.test/health" }, "http://127.0.0.1");
  assert.equal(profile.vus, 20);
  assert.equal(profile.seconds, 30);
  assert.throws(() => safeHttpUrl("file:///etc/passwd"));
});

test("appium capabilities stay on the allowlist", () => {
  const capabilities = appiumCapabilities({
    capabilities: { platformName: "Android", "appium:automationName": "UiAutomator2", "appium:deviceName": "emulator" },
  });
  assert.equal(capabilities.alwaysMatch.platformName, "Android");
  assert.throws(() => appiumCapabilities({ capabilities: { platformName: "Android", "appium:automationName": "UiAutomator2", "appium:chromeOptions": "{}" } }));
});

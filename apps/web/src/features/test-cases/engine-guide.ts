import { EngineType, StepAction, TestCaseType } from "@atp/shared-types";

export interface FieldHint {
  label: string;
  placeholder: string;
  help: string;
}

export interface ActionGuide {
  label: string;
  target?: FieldHint;
  value?: FieldHint & { json?: boolean };
}

export interface StepTemplate {
  action: StepAction;
  target?: string;
  value?: string;
  assertion?: string;
}

export interface EngineGuide {
  label: string;
  summary: string;
  type: TestCaseType;
  actions: StepAction[];
  singleStep?: boolean;
  assertion?: FieldHint;
  starter: StepTemplate[];
  note?: string;
}

const PAGE_TARGET: FieldHint = {
  label: "Element",
  placeholder: "#email  or  button[type=submit]  or  text=Sign in",
  help: "CSS selector or Playwright text selector for the element.",
};

export const ACTION_GUIDE: Record<StepAction, ActionGuide> = {
  navigate: {
    label: "Open page",
    value: { label: "Page", placeholder: "/login  or  https://example.com/login", help: "A path is joined to the project website URL." },
  },
  click: { label: "Click", target: PAGE_TARGET },
  fill: {
    label: "Type text",
    target: { ...PAGE_TARGET, placeholder: "#email  or  input[name=email]" },
    value: { label: "Text", placeholder: "user@example.com  or  {{USER_EMAIL}}", help: "Use {{NAME}} to insert an environment variable." },
  },
  select: {
    label: "Choose option",
    target: { ...PAGE_TARGET, placeholder: "select#country" },
    value: { label: "Option value", placeholder: "IN", help: "The value attribute of the option to choose." },
  },
  check: { label: "Tick checkbox", target: { ...PAGE_TARGET, placeholder: "#accept-terms" } },
  uncheck: { label: "Untick checkbox", target: { ...PAGE_TARGET, placeholder: "#newsletter" } },
  upload: {
    label: "Upload file",
    target: { ...PAGE_TARGET, placeholder: "input[type=file]" },
    value: { label: "File path", placeholder: "avatar.png", help: "File inside the run's artifact folder." },
  },
  download: { label: "Download file", target: { ...PAGE_TARGET, placeholder: "a#export-csv", help: "The element that starts the download." } },
  assertText: {
    label: "Check text",
    target: { ...PAGE_TARGET, placeholder: "h1  or  .toast-message" },
    value: { label: "Expected text", placeholder: "Welcome back", help: "The element must contain this text." },
  },
  assertVisible: { label: "Check visible", target: { ...PAGE_TARGET, placeholder: ".dashboard" } },
  wait: {
    label: "Wait for",
    target: { ...PAGE_TARGET, placeholder: ".spinner-done  (leave empty to wait for the page)", help: "Waits up to the timeout for the element." },
  },
  screenshot: {
    label: "Take screenshot",
    value: { label: "File name", placeholder: "after-login", help: "Optional. Saved with the run evidence." },
  },
  httpRequest: {
    label: "Send request",
    target: { label: "URL", placeholder: "/users/1  or  https://api.example.com/users/1", help: "A path is joined to the project API URL." },
    value: {
      label: "Request (JSON)",
      placeholder: '{ "method": "POST", "headers": { "Authorization": "Bearer {{API_TOKEN}}" }, "body": { "name": "Asha" } }',
      help: "Optional. Leave empty for a plain GET.",
      json: true,
    },
  },
  securityHeaders: {
    label: "Check security headers",
    target: { label: "URL", placeholder: "https://staging.example.com  (empty = project website URL)", help: "Only reads response headers. No attack traffic is sent." },
  },
  repeatRequest: {
    label: "Repeat request",
    target: { label: "URL", placeholder: "/health  (empty = project API URL)", help: "Called several times in a row." },
    value: { label: "Settings (JSON)", placeholder: '{ "attempts": 5, "minSuccessRatio": 0.8 }', help: "Up to 10 attempts. 0.8 means 4 of 5 must succeed.", json: true },
  },
  k6: {
    label: "Load test",
    value: { label: "Load (JSON)", placeholder: '{ "vus": 5, "seconds": 10, "url": "https://staging.example.com" }', help: "Max 20 virtual users for 30 seconds. Needs k6 installed.", json: true },
  },
  query: {
    label: "Query database",
    value: {
      label: "Query (JSON)",
      placeholder: '{ "collection": "users", "filter": { "email": "asha@example.com" }, "expectedCount": 1 }',
      help: "Read-only MongoDB query. Set DATABASE_URL as an environment variable.",
      json: true,
    },
  },
  compareFile: {
    label: "Compare file",
    target: { label: "File", placeholder: "exports/orders.csv", help: "Path inside storage/fixtures." },
    value: { label: "Expected (JSON)", placeholder: '{ "contains": "Order ID" }  or  { "equals": "exact file text" }', help: "Use contains or equals.", json: true },
  },
  fileContains: {
    label: "Source file contains",
    target: { label: "File", placeholder: "apps/api/src/main.ts", help: "Path under apps/, packages/, or docs/." },
    value: { label: "Expected text", placeholder: "enableCors", help: "The file must contain this text." },
  },
  webhook: {
    label: "Send webhook",
    target: { label: "Webhook URL", placeholder: "https://hooks.example.com/test", help: "Receives a JSON POST." },
    value: { label: "Body (JSON)", placeholder: '{ "text": "Test notification" }', help: "Optional message body.", json: true },
  },
  appiumSession: {
    label: "Start app session",
    value: {
      label: "Capabilities (JSON)",
      placeholder: '{ "capabilities": { "platformName": "Android", "appium:automationName": "UiAutomator2", "appium:deviceName": "Pixel 7", "appium:app": "/apps/demo.apk" } }',
      help: "Needs an Appium server and APPIUM_URL.",
      json: true,
    },
  },
};

const BROWSER_ACTIONS: StepAction[] = ["navigate", "click", "fill", "select", "check", "uncheck", "upload", "download", "assertText", "assertVisible", "wait", "screenshot"];

const REQUEST_CHECKS: FieldHint = {
  label: "Checks (JSON)",
  placeholder: '{ "status": 200, "json": { "path": "data.id", "equals": 1 }, "maxDurationMs": 1000 }',
  help: "Optional. Supports status, header, json, schema, and maxDurationMs.",
};

export const ENGINE_GUIDE: Record<EngineType, EngineGuide> = {
  web: {
    label: "Web UI",
    summary: "Drive a real browser: open pages, click, type, and check what is shown.",
    type: "functional",
    actions: BROWSER_ACTIONS,
    starter: [{ action: "navigate", value: "/" }, { action: "assertVisible", target: "body" }],
  },
  api: {
    label: "API",
    summary: "Send HTTP requests and check the status, headers, and JSON response.",
    type: "api",
    actions: ["httpRequest"],
    assertion: REQUEST_CHECKS,
    starter: [{ action: "httpRequest", target: "/health", assertion: '{ "status": 200 }' }],
  },
  accessibility: {
    label: "Accessibility",
    summary: "Open a page and scan it with axe. Fails on any accessibility violation.",
    type: "functional",
    actions: ["navigate", "click", "fill", "wait", "assertVisible"],
    starter: [{ action: "navigate", value: "/" }],
  },
  visual: {
    label: "Visual comparison",
    summary: "Screenshot a page and compare it with the saved baseline. The first run saves the baseline.",
    type: "regression",
    actions: ["navigate", "click", "fill", "wait", "screenshot"],
    starter: [{ action: "navigate", value: "/" }],
  },
  localization: {
    label: "Localization",
    summary: "Open a page and check its language and expected translated text.",
    type: "functional",
    actions: ["navigate", "click", "wait"],
    assertion: {
      label: "Language checks (JSON)",
      placeholder: '{ "lang": "ta", "includes": ["வணக்கம்"] }',
      help: "Add to one step. lang is the page's html lang; includes lists text that must appear.",
    },
    starter: [{ action: "navigate", value: "/", assertion: '{ "lang": "en", "includes": ["Welcome"] }' }],
  },
  contract: {
    label: "API contract",
    summary: "Send a request and validate the response against a JSON schema.",
    type: "api",
    actions: ["httpRequest"],
    assertion: {
      label: "Checks with schema (JSON)",
      placeholder: '{ "status": 200, "schema": { "type": "object", "required": ["id"], "properties": { "id": { "type": "number" } } } }',
      help: "A schema is required for contract tests.",
    },
    starter: [{ action: "httpRequest", target: "/users/1", assertion: '{ "status": 200, "schema": { "type": "object", "required": ["id"] } }' }],
  },
  security: {
    label: "Security headers",
    summary: "Check that the site sends basic security headers. Defensive only.",
    type: "functional",
    actions: ["securityHeaders"],
    singleStep: true,
    starter: [{ action: "securityHeaders" }],
  },
  reliability: {
    label: "Reliability",
    summary: "Call a URL several times and require a minimum success ratio.",
    type: "functional",
    actions: ["repeatRequest"],
    singleStep: true,
    starter: [{ action: "repeatRequest", target: "/health", value: '{ "attempts": 5, "minSuccessRatio": 1 }' }],
  },
  performance: {
    label: "Performance (k6)",
    summary: "Run a short k6 load test against a URL.",
    type: "functional",
    actions: ["k6"],
    singleStep: true,
    note: "Requires the k6 binary on this machine.",
    starter: [{ action: "k6", value: '{ "vus": 2, "seconds": 5 }' }],
  },
  database: {
    label: "Database",
    summary: "Run a read-only MongoDB query and check how many documents match.",
    type: "functional",
    actions: ["query"],
    singleStep: true,
    note: "Add a DATABASE_URL variable to an environment in Settings, then pick that environment under More details.",
    starter: [{ action: "query", value: '{ "collection": "users", "filter": {}, "expectedCount": 1 }' }],
  },
  file: {
    label: "File check",
    summary: "Check the contents of a file in storage/fixtures.",
    type: "functional",
    actions: ["compareFile"],
    singleStep: true,
    starter: [{ action: "compareFile", target: "sample.txt", value: '{ "contains": "hello" }' }],
  },
  architecture: {
    label: "Code rule",
    summary: "Check that a source file in this repo contains expected text.",
    type: "functional",
    actions: ["fileContains"],
    singleStep: true,
    starter: [{ action: "fileContains", target: "apps/api/src/main.ts", value: "enableCors" }],
  },
  notification: {
    label: "Notification",
    summary: "Send a JSON POST to a webhook and check it is accepted.",
    type: "functional",
    actions: ["webhook"],
    singleStep: true,
    starter: [{ action: "webhook", target: "https://hooks.example.com/test", value: '{ "text": "Test notification" }' }],
  },
  mobile: {
    label: "Mobile (Appium)",
    summary: "Open a session on an Android or iOS device through Appium.",
    type: "functional",
    actions: ["appiumSession"],
    singleStep: true,
    note: "Requires an Appium server and APPIUM_URL in .env.",
    starter: [{ action: "appiumSession", value: '{ "capabilities": { "platformName": "Android", "appium:automationName": "UiAutomator2" } }' }],
  },
};

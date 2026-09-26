export function safeHttpUrl(value: string, base?: string) {
  const url = new URL(value, base);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  return url;
}

export function missingSecurityHeaders(url: URL, headers: { get(name: string): string | null }) {
  const missing: string[] = [];
  if (headers.get("x-content-type-options")?.toLowerCase() !== "nosniff") missing.push("x-content-type-options: nosniff");
  if (!headers.get("x-frame-options") && !headers.get("content-security-policy")) {
    missing.push("x-frame-options or content-security-policy");
  }
  if (!headers.get("referrer-policy")) missing.push("referrer-policy");
  if (url.protocol === "https:" && !headers.get("strict-transport-security")) missing.push("strict-transport-security");
  return missing;
}

export function safeFilter(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const filter: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key)) {
      throw new Error(`Filter field ${key} is not allowed`);
    }
    if (item !== null && typeof item === "object") {
      throw new Error("Filter values must be plain text, numbers, or booleans");
    }
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean" || item === null) {
      filter[key] = item;
    }
  }
  return filter;
}

export function safeCollection(name: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(name)) {
    throw new Error("Collection name is not allowed");
  }
  return name;
}

export function k6Profile(value: unknown, fallbackUrl: string) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const vus = Math.min(20, Math.max(1, Math.floor(Number(record.vus) || 1)));
  const seconds = Math.min(30, Math.max(1, Math.floor(Number(record.seconds) || 5)));
  const rawUrl = typeof record.url === "string" && record.url ? record.url : fallbackUrl;
  return { vus, seconds, url: safeHttpUrl(rawUrl).toString() };
}

const APPIUM_KEYS = new Set(["platformName", "appium:automationName", "appium:deviceName", "appium:app"]);
const AUTOMATION_NAMES = new Set(["UiAutomator2", "XCUITest"]);

export function appiumCapabilities(value: unknown) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const source = record.capabilities && typeof record.capabilities === "object" ? (record.capabilities as Record<string, unknown>) : {};
  const alwaysMatch: Record<string, string> = {};
  for (const [key, item] of Object.entries(source)) {
    if (!APPIUM_KEYS.has(key) || typeof item !== "string" || item.length > 300 || item.includes("\n")) {
      throw new Error(`Appium capability ${key} is not allowed`);
    }
    alwaysMatch[key] = item;
  }
  if (alwaysMatch.platformName !== "Android" && alwaysMatch.platformName !== "iOS") {
    throw new Error("Appium platformName must be Android or iOS");
  }
  if (!AUTOMATION_NAMES.has(alwaysMatch["appium:automationName"] ?? "")) {
    throw new Error("Appium automationName must be UiAutomator2 or XCUITest");
  }
  return { alwaysMatch };
}

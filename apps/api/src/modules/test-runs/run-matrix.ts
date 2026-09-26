const BROWSERS = new Set(["chromium", "firefox", "webkit"]);

export interface RunMatrix {
  browser?: string;
  viewport?: { width: number; height: number };
}

export function matrixCombinations(config?: Record<string, unknown>): RunMatrix[] {
  const browsers = readBrowsers(config);
  const viewports = readViewports(config);
  const browserList = browsers.length > 0 ? browsers : [undefined];
  const viewportList = viewports.length > 0 ? viewports : [undefined];
  const combinations: RunMatrix[] = [];
  for (const browser of browserList) {
    for (const viewport of viewportList) {
      combinations.push({ browser, viewport });
    }
  }
  return combinations;
}

export function jobVariant(testCaseId: string, payload: { browser?: unknown; viewport?: unknown }) {
  const browser = typeof payload.browser === "string" ? payload.browser : "";
  const viewport = readViewport(payload.viewport);
  const size = viewport ? `${viewport.width}x${viewport.height}` : "";
  return `${testCaseId}|${browser}|${size}`;
}

export function readViewport(value: unknown): { width: number; height: number } | undefined {
  return readViewports({ viewports: [value] })[0];
}

function readBrowsers(config?: Record<string, unknown>): string[] {
  if (!config) return [];
  if (Array.isArray(config.browsers)) {
    return config.browsers.filter((item): item is string => typeof item === "string" && BROWSERS.has(item));
  }
  if (typeof config.browser === "string" && BROWSERS.has(config.browser)) return [config.browser];
  return [];
}

function readViewports(config?: Record<string, unknown>): { width: number; height: number }[] {
  if (!config || !Array.isArray(config.viewports)) return [];
  const parsed: { width: number; height: number }[] = [];
  for (const item of config.viewports) {
    if (!item || typeof item !== "object") continue;
    const width = Number((item as { width?: unknown }).width);
    const height = Number((item as { height?: unknown }).height);
    if (Number.isInteger(width) && Number.isInteger(height) && width >= 200 && width <= 4000 && height >= 200 && height <= 4000) {
      parsed.push({ width, height });
    }
  }
  return parsed;
}

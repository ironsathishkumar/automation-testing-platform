import { ExecutionContext } from "@atp/engine-contracts";
import { Browser, BrowserContext, Page, chromium, firefox, webkit } from "playwright";

export const WATCH_SLOW_MO_MS = 600;

export interface BrowserSession {
  page: Page;
  close: () => Promise<void>;
}

export async function launchBrowser(context: ExecutionContext, logs?: string[]): Promise<Browser> {
  const browserName = context.browser ?? "chromium";
  const launcher = browserName === "firefox" ? firefox : browserName === "webkit" ? webkit : chromium;
  if (context.headed) {
    try {
      return await launcher.launch({ headless: false, slowMo: WATCH_SLOW_MO_MS, timeout: context.timeoutMs });
    } catch (error) {
      const reason = error instanceof Error ? error.message.split("\n")[0] : "unknown error";
      logs?.push(`Could not open a visible browser (${reason}); ran hidden instead.`);
    }
  }
  return launcher.launch({ headless: true, timeout: context.timeoutMs });
}

export async function openBrowser(context: ExecutionContext): Promise<BrowserSession> {
  const browser = await launchBrowser(context);
  let browserContext: BrowserContext | undefined;
  try {
    browserContext = await browser.newContext({
      baseURL: context.baseUrl,
      viewport: context.viewport ?? { width: 1280, height: 720 },
    });
    const page = await browserContext.newPage();
    page.setDefaultTimeout(context.timeoutMs);
    return {
      page,
      close: async () => {
        await browserContext?.close().catch(() => undefined);
        await browser.close().catch(() => undefined);
      },
    };
  } catch (error) {
    await browserContext?.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    throw error;
  }
}

import { ExecutionContext } from "@atp/engine-contracts";
import { Browser, BrowserContext, Page, chromium, firefox, webkit } from "playwright";

export interface BrowserSession {
  page: Page;
  close: () => Promise<void>;
}

export async function openBrowser(context: ExecutionContext): Promise<BrowserSession> {
  const browserName = context.browser ?? "chromium";
  const launcher = browserName === "firefox" ? firefox : browserName === "webkit" ? webkit : chromium;
  const browser: Browser = await launcher.launch({ headless: true, timeout: context.timeoutMs });
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

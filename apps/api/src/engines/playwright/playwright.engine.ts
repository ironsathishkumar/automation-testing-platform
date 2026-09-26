import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { ArtifactReference, EngineResult, ExecutionContext, StepResult, TestEngine } from "@atp/engine-contracts";
import { TestStep } from "@atp/shared-types";
import { Browser, BrowserContext, Download, Page, chromium, firefox, webkit } from "playwright";
import { boundedTimeout, relativeArtifact, uploadPath } from "./playwright.helpers";

@Injectable()
export class PlaywrightEngine implements TestEngine {
  readonly type = "web";
  private readonly sessions = new Map<string, { close: () => Promise<void> }>();

  getCapabilities() {
    return {
      actions: ["navigate", "click", "fill", "select", "check", "uncheck", "upload", "download", "assertText", "assertVisible", "wait", "screenshot"],
      browsers: ["chromium", "firefox", "webkit"],
    };
  }

  async validate() {
    return { valid: true, issues: [] };
  }

  async cancel(executionId: string) {
    const session = this.sessions.get(executionId);
    if (session) await session.close();
  }

  async execute(context: ExecutionContext): Promise<EngineResult> {
    const started = Date.now();
    const logs: string[] = [];
    const steps: StepResult[] = [];
    const artifacts: ArtifactReference[] = [];
    const errors: { code: string; message: string }[] = [];
    const browserName = context.browser ?? "chromium";
    const launcher = browserName === "firefox" ? firefox : browserName === "webkit" ? webkit : chromium;
    let browser: Browser | undefined;
    let browserContext: BrowserContext | undefined;
    try {
      browser = await launcher.launch({ headless: true, timeout: context.timeoutMs });
      const videoDir = path.join(context.artifactDirectory, "videos");
      mkdirSync(videoDir, { recursive: true });
      browserContext = await browser.newContext({
        baseURL: context.baseUrl,
        acceptDownloads: true,
        recordVideo: { dir: videoDir },
      });
      await browserContext.tracing.start({ screenshots: true, snapshots: true });
      const page = await browserContext.newPage();
      page.setDefaultTimeout(context.timeoutMs);
      this.sessions.set(context.jobId, {
        close: async () => {
          await browserContext?.close().catch(() => undefined);
          await browser?.close().catch(() => undefined);
        },
      });
      let failed = false;
      for (const step of context.steps) {
        if (context.signal.aborted) {
          return this.finish("cancelled", started, steps, errors, artifacts, logs);
        }
        const stepStarted = Date.now();
        try {
          const produced = await this.runStep(page, step, context);
          artifacts.push(...produced);
          steps.push({ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - stepStarted });
          logs.push(`step_passed ${step.action}`);
        } catch (error) {
          failed = true;
          const message = error instanceof Error ? error.message : "Step failed";
          const shot = await this.capture(page, context, `failure-${step.order}.png`);
          if (shot) artifacts.push(shot);
          steps.push({ id: step.id, order: step.order, action: step.action, status: "failed", durationMs: Date.now() - stepStarted, error: message });
          errors.push({ code: message.toLowerCase().includes("timeout") ? "TIMEOUT_ERROR" : "EXECUTION_ERROR", message });
          logs.push(`step_failed ${step.action}: ${message}`);
          break;
        }
      }
      const tracePath = path.join(context.artifactDirectory, "trace.zip");
      await browserContext.tracing.stop({ path: tracePath });
      artifacts.push(this.reference(context, tracePath, "trace", "application/zip"));
      const video = pageVideo(page);
      await browserContext.close();
      browserContext = undefined;
      if (video) {
        const videoPath = await video.path();
        artifacts.push(this.reference(context, videoPath, "video", "video/webm"));
      }
      await browser.close();
      browser = undefined;
      return this.finish(context.signal.aborted ? "cancelled" : failed ? "failed" : "passed", started, steps, errors, artifacts, logs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Browser crashed";
      errors.push({ code: "ENGINE_ERROR", message });
      logs.push(message);
      return this.finish("failed", started, steps, errors, artifacts, logs);
    } finally {
      this.sessions.delete(context.jobId);
      await browserContext?.close().catch(() => undefined);
      await browser?.close().catch(() => undefined);
    }
  }

  private async runStep(page: Page, step: TestStep, context: ExecutionContext): Promise<ArtifactReference[]> {
    const timeout = boundedTimeout(step.timeoutMs, context.timeoutMs);
    const target = step.target ?? "";
    const value = step.value === undefined || step.value === null ? "" : String(step.value);
    switch (step.action) {
      case "navigate":
        await page.goto(value || target, { timeout });
        return [];
      case "click":
        await page.locator(target).click({ timeout });
        return [];
      case "fill":
        await page.locator(target).fill(value, { timeout });
        return [];
      case "select":
        await page.locator(target).selectOption(value, { timeout });
        return [];
      case "check":
        await page.locator(target).check({ timeout });
        return [];
      case "uncheck":
        await page.locator(target).uncheck({ timeout });
        return [];
      case "upload":
        await page.locator(target).setInputFiles(uploadPath(context.artifactDirectory, step.value), { timeout });
        return [];
      case "download": {
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout }),
          page.locator(target).click({ timeout }),
        ]);
        return [await this.saveDownload(download, context)];
      }
      case "assertVisible":
        await page.locator(target).waitFor({ state: "visible", timeout });
        return [];
      case "assertText": {
        const text = await page.locator(target).innerText({ timeout });
        if (!text.includes(value)) throw new Error(`Expected text "${value}" but found "${text}"`);
        return [];
      }
      case "wait":
        if (target) await page.locator(target).waitFor({ state: "visible", timeout });
        else await page.waitForTimeout(Math.min(timeout, 30_000));
        return [];
      case "screenshot": {
        const shot = await this.capture(page, context, value || `step-${step.order}.png`);
        return shot ? [shot] : [];
      }
      default:
        throw new Error(`Web engine does not support ${step.action}`);
    }
  }

  private async capture(page: Page, context: ExecutionContext, fileName: string) {
    const file = path.join(context.artifactDirectory, "screenshots", fileName.replace(/[^\w.-]+/g, "-"));
    mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, fullPage: true });
    return this.reference(context, file, "screenshot", "image/png");
  }

  private async saveDownload(download: Download, context: ExecutionContext) {
    const fileName = path.basename(download.suggestedFilename());
    const file = path.join(context.artifactDirectory, "downloads", fileName);
    mkdirSync(path.dirname(file), { recursive: true });
    await download.saveAs(file);
    return this.reference(context, file, "other", "application/octet-stream");
  }

  private reference(context: ExecutionContext, absoluteFile: string, type: ArtifactReference["type"], mimeType: string): ArtifactReference {
    return {
      type,
      fileName: path.basename(absoluteFile),
      relativePath: relativeArtifact(context.artifactDirectory, absoluteFile),
      mimeType,
      sizeBytes: statSync(absoluteFile).size,
    };
  }

  private finish(
    status: EngineResult["status"],
    started: number,
    steps: StepResult[],
    errors: EngineResult["errors"],
    artifacts: ArtifactReference[],
    logs: string[],
  ): EngineResult {
    return { status, durationMs: Date.now() - started, steps, errors, artifacts, logs };
  }
}

function pageVideo(page: Page) {
  return page.video();
}

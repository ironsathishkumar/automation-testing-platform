import { mkdirSync } from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { ArtifactReference, EngineResult, ExecutionContext, StepResult, TestEngine } from "@atp/engine-contracts";
import { Browser, BrowserContext, Page } from "playwright";
import { launchBrowser } from "./browser-session";
import { artifactReference, captureScreenshot, executeWebStep } from "./playwright.steps";

const WATCH_END_PAUSE_MS = 1500;

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
    let browser: Browser | undefined;
    let browserContext: BrowserContext | undefined;
    try {
      browser = await launchBrowser(context, logs);
      const videoDir = path.join(context.artifactDirectory, "videos");
      mkdirSync(videoDir, { recursive: true });
      browserContext = await browser.newContext({
        baseURL: context.baseUrl,
        acceptDownloads: true,
        viewport: context.viewport ?? { width: 1280, height: 720 },
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
          const produced = await executeWebStep(page, step, context);
          artifacts.push(...produced);
          steps.push({ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - stepStarted });
          const shot = await captureScreenshot(page, context, `step-${step.order}.png`).catch(() => undefined);
          if (shot) artifacts.push(shot);
          logs.push(`step_passed ${step.action}`);
        } catch (error) {
          failed = true;
          const message = error instanceof Error ? error.message : "Step failed";
          const shot = await captureScreenshot(page, context, `failure-${step.order}.png`);
          if (shot) artifacts.push(shot);
          steps.push({ id: step.id, order: step.order, action: step.action, status: "failed", durationMs: Date.now() - stepStarted, error: message });
          errors.push({ code: message.toLowerCase().includes("timeout") ? "TIMEOUT_ERROR" : "EXECUTION_ERROR", message });
          logs.push(`step_failed ${step.action}: ${message}`);
          break;
        }
      }
      if (context.headed && !context.signal.aborted) await page.waitForTimeout(WATCH_END_PAUSE_MS).catch(() => undefined);
      const tracePath = path.join(context.artifactDirectory, "trace.zip");
      await browserContext.tracing.stop({ path: tracePath });
      artifacts.push(artifactReference(context, tracePath, "trace", "application/zip"));
      const video = pageVideo(page);
      await browserContext.close();
      browserContext = undefined;
      if (video) {
        const videoPath = await video.path();
        artifacts.push(artifactReference(context, videoPath, "video", "video/webm"));
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

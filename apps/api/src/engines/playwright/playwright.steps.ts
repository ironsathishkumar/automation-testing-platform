import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { ArtifactReference, ExecutionContext } from "@atp/engine-contracts";
import { TestStep } from "@atp/shared-types";
import { Download, Page } from "playwright";
import { applyVariables } from "../api/api.helpers";
import { boundedTimeout, relativeArtifact, uploadPath } from "./playwright.helpers";

// Client-rendered apps ignore clicks until their JavaScript has loaded, and a click that changes the route
// swaps the screen out from under the next step, so wait for the network to go quiet after both.
const SETTLE_TIMEOUT_MS = 5000;

export async function executeWebStep(page: Page, step: TestStep, context: ExecutionContext): Promise<ArtifactReference[]> {
  const timeout = boundedTimeout(step.timeoutMs, context.timeoutMs);
  const target = applyVariables(step.target ?? "", context.variables);
  const value = step.value === undefined || step.value === null ? "" : applyVariables(String(step.value), context.variables);
  switch (step.action) {
    case "navigate":
      await page.goto(value || target, { timeout });
      await settle(page);
      return [];
    case "click":
      await page.locator(target).click({ timeout });
      await settle(page);
      return [];
    case "fill":
      await page.locator(target).fill(value, { timeout });
      return [];
    case "press":
      if (target) await page.locator(target).press(value || "Enter", { timeout });
      else await page.keyboard.press(value || "Enter");
      await settle(page);
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
      return [await saveDownload(download, context)];
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
      const shot = await captureScreenshot(page, context, value || `step-${step.order}.png`);
      return shot ? [shot] : [];
    }
    default:
      throw new Error(`Web engine does not support ${step.action}`);
  }
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS }).catch(() => undefined);
}

export async function captureScreenshot(page: Page, context: ExecutionContext, fileName: string) {
  const file = path.join(context.artifactDirectory, "screenshots", fileName.replace(/[^\w.-]+/g, "-"));
  mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: true });
  return artifactReference(context, file, "screenshot", "image/png");
}

export function artifactReference(
  context: ExecutionContext,
  absoluteFile: string,
  type: ArtifactReference["type"],
  mimeType: string,
): ArtifactReference {
  return {
    type,
    fileName: path.basename(absoluteFile),
    relativePath: relativeArtifact(context.artifactDirectory, absoluteFile),
    mimeType,
    sizeBytes: statSync(absoluteFile).size,
  };
}

async function saveDownload(download: Download, context: ExecutionContext) {
  const fileName = path.basename(download.suggestedFilename());
  const file = path.join(context.artifactDirectory, "downloads", fileName);
  mkdirSync(path.dirname(file), { recursive: true });
  await download.saveAs(file);
  return artifactReference(context, file, "other", "application/octet-stream");
}

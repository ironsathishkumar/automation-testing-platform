import path from "node:path";
import { resolveInside } from "../../common/safe-path";

export function boundedTimeout(value: number | undefined, fallback: number) {
  const timeout = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(Math.max(timeout, 1), 120_000);
}

export function uploadPath(artifactDirectory: string, value: unknown) {
  const requested = String(value ?? "");
  if (!requested) {
    throw new Error("Upload needs a file path inside this run's artifact folder");
  }
  return resolveInside(artifactDirectory, requested);
}

export function relativeArtifact(artifactDirectory: string, absoluteFile: string) {
  const root = path.resolve(artifactDirectory, "..", "..", "..");
  return path.relative(root, absoluteFile);
}

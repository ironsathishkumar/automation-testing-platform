import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_HOST: z.string().default("127.0.0.1"),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ARTIFACT_ROOT: z.string().default("storage/artifacts"),
  LOG_ROOT: z.string().default("storage/logs"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
});

export type AppConfig = z.infer<typeof envSchema> & {
  repoRoot: string;
  webOrigins: string[];
};

export function detectRepoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "apps")) && existsSync(path.join(cwd, "docs"))) {
    return cwd;
  }
  return path.resolve(cwd, "../..");
}

export function loadAppConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(source);
  const repoRoot = detectRepoRoot();
  const webOrigins = parsed.WEB_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
  return {
    ...parsed,
    repoRoot,
    webOrigins: webOrigins.length > 0 ? webOrigins : ["http://localhost:3000"],
    ARTIFACT_ROOT: path.resolve(repoRoot, parsed.ARTIFACT_ROOT),
    LOG_ROOT: path.resolve(repoRoot, parsed.LOG_ROOT),
  };
}

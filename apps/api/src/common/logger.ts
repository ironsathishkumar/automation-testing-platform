import { mkdirSync } from "node:fs";
import { utilities as nestWinstonModuleUtilities } from "nest-winston";
import * as winston from "winston";

const SENSITIVE = new Set(["password", "passwordhash", "token", "authorization", "secret", "accesstoken", "jwt"]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE.has(key.toLowerCase()) ? "[redacted]" : redact(item);
    }
    return output;
  }
  return value;
}

const redactFormat = winston.format((info) => redact(info) as winston.Logform.TransformableInfo);

export function createWinstonOptions(logRoot: string) {
  mkdirSync(logRoot, { recursive: true });
  return {
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          redactFormat(),
          nestWinstonModuleUtilities.format.nestLike("api", { prettyPrint: true }),
        ),
      }),
      new winston.transports.File({
        dirname: logRoot,
        filename: "api.log",
        format: winston.format.combine(winston.format.timestamp(), redactFormat(), winston.format.json()),
      }),
    ],
  };
}

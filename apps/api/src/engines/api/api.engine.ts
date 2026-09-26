import { Injectable } from "@nestjs/common";
import { EngineResult, ExecutionContext, StepResult, TestEngine } from "@atp/engine-contracts";
import { TestStep } from "@atp/shared-types";
import Ajv from "ajv";
import { applyVariables, buildUrl, readJsonPath } from "./api.helpers";

interface RequestValue {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  auth?: { type?: "bearer" | "basic"; token?: string; username?: string; password?: string };
}

interface AssertionValue {
  status?: number;
  header?: { name: string; includes?: string; equals?: string };
  json?: { path: string; equals: unknown };
  schema?: Record<string, unknown>;
  maxDurationMs?: number;
}

const ajv = new Ajv({ allErrors: true, strict: false });

@Injectable()
export class ApiEngine implements TestEngine {
  readonly type = "api";

  getCapabilities() {
    return { actions: ["httpRequest"] };
  }

  async validate() {
    return { valid: true, issues: [] };
  }

  async cancel() {
    return undefined;
  }

  async execute(context: ExecutionContext): Promise<EngineResult> {
    const started = Date.now();
    const steps: StepResult[] = [];
    const logs: string[] = [];
    const errors: EngineResult["errors"] = [];
    for (const step of context.steps.filter((item) => item.action === "httpRequest")) {
      if (context.signal.aborted) {
        return { status: "cancelled", durationMs: Date.now() - started, steps, errors, artifacts: [], logs };
      }
      const stepStarted = Date.now();
      try {
        await this.request(step, context);
        steps.push({ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - stepStarted });
        logs.push(`request passed ${step.target ?? ""}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Request failed";
        steps.push({ id: step.id, order: step.order, action: step.action, status: "failed", durationMs: Date.now() - stepStarted, error: message });
        errors.push({ code: message.includes("timed out") ? "TIMEOUT_ERROR" : "EXECUTION_ERROR", message });
        logs.push(message);
        return { status: "failed", durationMs: Date.now() - started, steps, errors, artifacts: [], logs };
      }
    }
    if (steps.length === 0) {
      return { status: "failed", durationMs: Date.now() - started, steps, errors: [{ code: "VALIDATION_ERROR", message: "API cases need an httpRequest step" }], artifacts: [], logs };
    }
    return { status: "passed", durationMs: Date.now() - started, steps, errors, artifacts: [], logs };
  }

  private async request(step: TestStep, context: ExecutionContext) {
    const spec = (step.value && typeof step.value === "object" ? step.value : {}) as RequestValue;
    const assertion = (step.assertion ?? {}) as AssertionValue;
    const method = (spec.method ?? "GET").toUpperCase();
    const target = applyVariables(step.target ?? "", context.variables);
    const query = Object.fromEntries(Object.entries(spec.query ?? {}).map(([key, value]) => [key, applyVariables(String(value), context.variables)]));
    const url = buildUrl(context.apiBaseUrl ?? context.baseUrl, target, query);
    const headers = new Headers();
    for (const [key, value] of Object.entries(spec.headers ?? {})) {
      headers.set(key, applyVariables(value, context.variables));
    }
    if (spec.auth?.type === "bearer" && spec.auth.token) {
      headers.set("Authorization", `Bearer ${applyVariables(spec.auth.token, context.variables)}`);
    }
    if (spec.auth?.type === "basic" && spec.auth.username) {
      const username = applyVariables(spec.auth.username, context.variables);
      const password = applyVariables(spec.auth.password ?? "", context.variables);
      headers.set("Authorization", `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`);
    }
    const timeout = step.timeoutMs ?? context.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const onAbort = () => controller.abort();
    context.signal.addEventListener("abort", onAbort);
    const requestStarted = Date.now();
    try {
      const body = spec.body === undefined ? undefined : JSON.stringify(substitute(spec.body, context.variables));
      if (body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      const response = await fetch(url, { method, headers, body, signal: controller.signal });
      const duration = Date.now() - requestStarted;
      const text = await response.text();
      if (assertion.status !== undefined && response.status !== assertion.status) {
        throw new Error(`Expected status ${assertion.status} but received ${response.status}`);
      }
      if (assertion.header) {
        const actual = response.headers.get(assertion.header.name) ?? "";
        if (assertion.header.equals !== undefined && actual !== assertion.header.equals) {
          throw new Error(`Header ${assertion.header.name} was "${actual}"`);
        }
        if (assertion.header.includes && !actual.includes(assertion.header.includes)) {
          throw new Error(`Header ${assertion.header.name} did not include "${assertion.header.includes}"`);
        }
      }
      if (assertion.maxDurationMs !== undefined && duration > assertion.maxDurationMs) {
        throw new Error(`Response took ${duration}ms, limit is ${assertion.maxDurationMs}ms`);
      }
      if (assertion.json || assertion.schema) {
        const payload = text ? JSON.parse(text) : null;
        if (assertion.json && JSON.stringify(readJsonPath(payload, assertion.json.path)) !== JSON.stringify(assertion.json.equals)) {
          throw new Error(`JSON path ${assertion.json.path} did not match`);
        }
        if (assertion.schema) {
          const validate = ajv.compile(assertion.schema);
          if (!validate(payload)) {
            throw new Error(`Response did not match schema: ${ajv.errorsText(validate.errors)}`);
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted && !context.signal.aborted) throw new Error("Request timed out");
      throw error;
    } finally {
      clearTimeout(timer);
      context.signal.removeEventListener("abort", onAbort);
    }
  }
}

function substitute(value: unknown, variables: Record<string, string>): unknown {
  if (typeof value === "string") return applyVariables(value, variables);
  if (Array.isArray(value)) return value.map((item) => substitute(item, variables));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item, variables)]));
  }
  return value;
}

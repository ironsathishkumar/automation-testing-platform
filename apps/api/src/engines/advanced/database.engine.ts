import { Injectable } from "@nestjs/common";
import { EngineResult, ExecutionContext, TestEngine } from "@atp/engine-contracts";
import { MongoClient } from "mongodb";
import { safeCollection, safeFilter } from "./advanced.helpers";

@Injectable()
export class DatabaseEngine implements TestEngine {
  readonly type = "database";

  getCapabilities() {
    return { actions: ["query"] };
  }

  async validate() {
    return { valid: true, issues: [] };
  }

  async cancel() {
    return undefined;
  }

  async execute(context: ExecutionContext): Promise<EngineResult> {
    const started = Date.now();
    const uri = context.variables.DATABASE_URL;
    if (!uri) return this.failed(started, "CONFIGURATION_ERROR", "Set the DATABASE_URL environment variable for this test");
    const step = context.steps[0];
    const spec = step?.value && typeof step.value === "object" ? (step.value as Record<string, unknown>) : {};
    let client: MongoClient | undefined;
    try {
      const collection = safeCollection(String(spec.collection ?? step?.target ?? ""));
      const filter = safeFilter(spec.filter);
      const expected = spec.expectedCount === undefined ? undefined : Math.min(20, Math.max(0, Number(spec.expectedCount)));
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      const documents = await client.db().collection(collection).find(filter).limit(20).toArray();
      if (expected !== undefined && documents.length !== expected) {
        return this.failed(started, "EXECUTION_ERROR", `Expected ${expected} document(s) and found ${documents.length}`);
      }
      return {
        status: "passed",
        durationMs: Date.now() - started,
        steps: step ? [{ id: step.id, order: step.order, action: step.action, status: "passed", durationMs: Date.now() - started }] : [],
        errors: [],
        artifacts: [],
        logs: [`database_read ${documents.length}`],
        metrics: { documents: documents.length },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(uri, "[database]") : "Database query failed";
      const code = message.includes("not allowed") || message.includes("must be") ? "VALIDATION_ERROR" : "EXECUTION_ERROR";
      return this.failed(started, code, message);
    } finally {
      await client?.close().catch(() => undefined);
    }
  }

  private failed(started: number, code: string, message: string): EngineResult {
    return { status: "failed", durationMs: Date.now() - started, steps: [], errors: [{ code, message }], artifacts: [], logs: [message] };
  }
}

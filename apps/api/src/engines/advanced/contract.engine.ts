import { Injectable } from "@nestjs/common";
import { EngineResult, ExecutionContext, TestEngine } from "@atp/engine-contracts";
import { ApiEngine } from "../api/api.engine";

@Injectable()
export class ContractEngine implements TestEngine {
  readonly type = "contract";

  constructor(private readonly api: ApiEngine) {}

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
    const requests = context.steps.filter((step) => step.action === "httpRequest");
    if (requests.length === 0 || requests.some((step) => !step.assertion?.schema)) {
      return {
        status: "failed",
        durationMs: 0,
        steps: [],
        errors: [{ code: "VALIDATION_ERROR", message: "A contract test needs an httpRequest step with a JSON schema" }],
        artifacts: [],
        logs: [],
      };
    }
    return this.api.execute(context);
  }
}

import { Injectable } from "@nestjs/common";
import { TestEngine } from "@atp/engine-contracts";

@Injectable()
export class EngineRegistry {
  private readonly engines = new Map<string, TestEngine>();
  private readonly cancellers = new Map<string, AbortController>();

  register(engine: TestEngine) {
    this.engines.set(engine.type, engine);
  }

  get(type: string) {
    return this.engines.get(type);
  }

  list() {
    return [...this.engines.values()].map((engine) => ({
      type: engine.type,
      ...engine.getCapabilities(),
    }));
  }

  begin(jobId: string) {
    const controller = new AbortController();
    this.cancellers.set(jobId, controller);
    return controller.signal;
  }

  cancel(jobId: string) {
    this.cancellers.get(jobId)?.abort();
  }

  finish(jobId: string) {
    this.cancellers.delete(jobId);
  }
}

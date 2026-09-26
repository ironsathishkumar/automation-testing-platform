import { Global, Module, OnModuleInit } from "@nestjs/common";
import { EngineRegistry } from "./engine-registry";
import { ApiEngine } from "./api/api.engine";
import { PlaywrightEngine } from "./playwright/playwright.engine";

@Global()
@Module({
  providers: [EngineRegistry, PlaywrightEngine, ApiEngine],
  exports: [EngineRegistry],
})
export class EnginesModule implements OnModuleInit {
  constructor(
    private readonly registry: EngineRegistry,
    private readonly playwright: PlaywrightEngine,
    private readonly api: ApiEngine,
  ) {}

  onModuleInit() {
    this.registry.register(this.playwright);
    this.registry.register(this.api);
  }
}

import { Global, Module, OnModuleInit } from "@nestjs/common";
import { EngineRegistry } from "./engine-registry";
import { PlaywrightEngine } from "./playwright/playwright.engine";

@Global()
@Module({
  providers: [EngineRegistry, PlaywrightEngine],
  exports: [EngineRegistry],
})
export class EnginesModule implements OnModuleInit {
  constructor(
    private readonly registry: EngineRegistry,
    private readonly playwright: PlaywrightEngine,
  ) {}

  onModuleInit() {
    this.registry.register(this.playwright);
  }
}

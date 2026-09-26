import { Global, Module, OnModuleInit } from "@nestjs/common";
import { EngineRegistry } from "./engine-registry";
import { ApiEngine } from "./api/api.engine";
import { PlaywrightEngine } from "./playwright/playwright.engine";
import { AccessibilityEngine } from "./quality/accessibility.engine";
import { VisualEngine } from "./quality/visual.engine";

@Global()
@Module({
  providers: [EngineRegistry, PlaywrightEngine, ApiEngine, AccessibilityEngine, VisualEngine],
  exports: [EngineRegistry],
})
export class EnginesModule implements OnModuleInit {
  constructor(
    private readonly registry: EngineRegistry,
    private readonly playwright: PlaywrightEngine,
    private readonly api: ApiEngine,
    private readonly accessibility: AccessibilityEngine,
    private readonly visual: VisualEngine,
  ) {}

  onModuleInit() {
    this.registry.register(this.playwright);
    this.registry.register(this.api);
    this.registry.register(this.accessibility);
    this.registry.register(this.visual);
  }
}

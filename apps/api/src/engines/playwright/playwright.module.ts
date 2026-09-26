import { Module, OnModuleInit } from "@nestjs/common";
import { EngineRegistry } from "../engine-registry";
import { PlaywrightEngine } from "./playwright.engine";

@Module({
  providers: [PlaywrightEngine],
})
export class PlaywrightModule implements OnModuleInit {
  constructor(
    private readonly registry: EngineRegistry,
    private readonly engine: PlaywrightEngine,
  ) {}

  onModuleInit() {
    this.registry.register(this.engine);
  }
}

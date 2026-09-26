import { Global, Module, OnModuleInit } from "@nestjs/common";
import { EngineRegistry } from "./engine-registry";
import { ApiEngine } from "./api/api.engine";
import { PlaywrightEngine } from "./playwright/playwright.engine";
import { AccessibilityEngine } from "./quality/accessibility.engine";
import { VisualEngine } from "./quality/visual.engine";
import { ArchitectureEngine } from "./advanced/architecture.engine";
import { ContractEngine } from "./advanced/contract.engine";
import { DatabaseEngine } from "./advanced/database.engine";
import { FileEngine } from "./advanced/file.engine";
import { LocalizationEngine } from "./advanced/localization.engine";
import { MobileEngine } from "./advanced/mobile.engine";
import { NotificationEngine } from "./advanced/notification.engine";
import { PerformanceEngine } from "./advanced/performance.engine";
import { ReliabilityEngine } from "./advanced/reliability.engine";
import { SecurityEngine } from "./advanced/security.engine";

@Global()
@Module({
  providers: [
    EngineRegistry,
    PlaywrightEngine,
    ApiEngine,
    AccessibilityEngine,
    VisualEngine,
    MobileEngine,
    PerformanceEngine,
    SecurityEngine,
    DatabaseEngine,
    ContractEngine,
    ArchitectureEngine,
    ReliabilityEngine,
    LocalizationEngine,
    FileEngine,
    NotificationEngine,
  ],
  exports: [EngineRegistry],
})
export class EnginesModule implements OnModuleInit {
  constructor(
    private readonly registry: EngineRegistry,
    private readonly playwright: PlaywrightEngine,
    private readonly api: ApiEngine,
    private readonly accessibility: AccessibilityEngine,
    private readonly visual: VisualEngine,
    private readonly mobile: MobileEngine,
    private readonly performance: PerformanceEngine,
    private readonly security: SecurityEngine,
    private readonly database: DatabaseEngine,
    private readonly contract: ContractEngine,
    private readonly architecture: ArchitectureEngine,
    private readonly reliability: ReliabilityEngine,
    private readonly localization: LocalizationEngine,
    private readonly file: FileEngine,
    private readonly notification: NotificationEngine,
  ) {}

  onModuleInit() {
    for (const engine of [
      this.playwright,
      this.api,
      this.accessibility,
      this.visual,
      this.mobile,
      this.performance,
      this.security,
      this.database,
      this.contract,
      this.architecture,
      this.reliability,
      this.localization,
      this.file,
      this.notification,
    ]) {
      this.registry.register(engine);
    }
  }
}

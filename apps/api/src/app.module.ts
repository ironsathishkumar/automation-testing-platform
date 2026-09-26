import { mkdirSync } from "node:fs";
import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import path from "node:path";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { EnvironmentsModule } from "./modules/environments/environments.module";
import { HealthModule } from "./modules/health/health.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { TestCasesModule } from "./modules/test-cases/test-cases.module";
import { TestPlansModule } from "./modules/test-plans/test-plans.module";
import { TestRunsModule } from "./modules/test-runs/test-runs.module";
import { TestSuitesModule } from "./modules/test-suites/test-suites.module";
import { EnginesModule } from "./engines/engines.module";
import { PlatformModule } from "./platform/platform.module";

@Module({
  imports: [
    PlatformModule,
    EnginesModule,
    HealthModule,
    AuthModule,
    ProjectsModule,
    ApplicationsModule,
    EnvironmentsModule,
    TestCasesModule,
    TestSuitesModule,
    TestPlansModule,
    TestRunsModule,
    DashboardModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const artifactRoot = this.config.getOrThrow<string>("ARTIFACT_ROOT");
    const logRoot = this.config.getOrThrow<string>("LOG_ROOT");
    const repoRoot = this.config.getOrThrow<string>("repoRoot");
    mkdirSync(artifactRoot, { recursive: true });
    mkdirSync(logRoot, { recursive: true });
    mkdirSync(path.join(repoRoot, "storage", "reports"), { recursive: true });
  }
}

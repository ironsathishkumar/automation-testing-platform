import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuditModule } from "../audit/audit.module";
import { Application, ApplicationSchema } from "../applications/application.schema";
import { Environment, EnvironmentSchema } from "../environments/environment.schema";
import { ProjectFile, ProjectFileSchema } from "../project-files/project-file.schema";
import { TestCase, TestCaseSchema } from "../test-cases/test-case.schema";
import { TestPlan, TestPlanSchema } from "../test-plans/test-plan.schema";
import { TestSuite, TestSuiteSchema } from "../test-suites/test-suite.schema";
import { Project, ProjectSchema } from "./project.schema";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Environment.name, schema: EnvironmentSchema },
      { name: TestCase.name, schema: TestCaseSchema },
      { name: TestSuite.name, schema: TestSuiteSchema },
      { name: TestPlan.name, schema: TestPlanSchema },
      { name: ProjectFile.name, schema: ProjectFileSchema },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ApplicationsModule } from "../applications/applications.module";
import { EnvironmentsModule } from "../environments/environments.module";
import { ProjectsModule } from "../projects/projects.module";
import { TestCase, TestCaseSchema } from "./test-case.schema";
import { TestCasesController } from "./test-cases.controller";
import { TestCasesService } from "./test-cases.service";

@Module({
  imports: [
    ProjectsModule,
    ApplicationsModule,
    EnvironmentsModule,
    MongooseModule.forFeature([{ name: TestCase.name, schema: TestCaseSchema }]),
  ],
  controllers: [TestCasesController],
  providers: [TestCasesService],
  exports: [TestCasesService],
})
export class TestCasesModule {}

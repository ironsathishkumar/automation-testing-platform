import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectsModule } from "../projects/projects.module";
import { TestCasesModule } from "../test-cases/test-cases.module";
import { TestSuite, TestSuiteSchema } from "./test-suite.schema";
import { TestSuitesController } from "./test-suites.controller";
import { TestSuitesService } from "./test-suites.service";

@Module({
  imports: [
    ProjectsModule,
    TestCasesModule,
    MongooseModule.forFeature([{ name: TestSuite.name, schema: TestSuiteSchema }]),
  ],
  controllers: [TestSuitesController],
  providers: [TestSuitesService],
  exports: [TestSuitesService],
})
export class TestSuitesModule {}

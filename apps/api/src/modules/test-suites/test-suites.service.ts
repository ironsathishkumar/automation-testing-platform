import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { TestSuite as TestSuiteView } from "@atp/shared-types";
import { CreateTestSuiteInput, UpdateTestSuiteInput } from "@atp/validation";
import { Model } from "mongoose";
import { AppException } from "../../common/app.exception";
import { asObjectId } from "../../common/ids";
import { ProjectsService } from "../projects/projects.service";
import { TestCasesService } from "../test-cases/test-cases.service";
import { TestSuite, TestSuiteDocument } from "./test-suite.schema";

@Injectable()
export class TestSuitesService {
  constructor(
    @InjectModel(TestSuite.name) private readonly suites: Model<TestSuite>,
    private readonly projects: ProjectsService,
    private readonly testCases: TestCasesService,
  ) {}

  async list(projectId: string): Promise<TestSuiteView[]> {
    await this.projects.ensure(projectId);
    const records = await this.suites.find({ projectId: asObjectId(projectId) }).sort({ name: 1 });
    return records.map((record) => this.present(record));
  }

  async get(id: string): Promise<TestSuiteView> {
    return this.present(await this.find(id));
  }

  async create(projectId: string, input: CreateTestSuiteInput): Promise<TestSuiteView> {
    await this.projects.ensure(projectId);
    await this.testCases.ensureIds(projectId, input.testCaseIds);
    const record = await this.suites.create({
      projectId: asObjectId(projectId),
      name: input.name,
      description: input.description,
      testCaseIds: input.testCaseIds.map((id) => asObjectId(id)),
      executionMode: input.executionMode,
      retryCount: input.retryCount,
      tags: input.tags,
    });
    return this.present(record);
  }

  async update(id: string, input: UpdateTestSuiteInput): Promise<TestSuiteView> {
    const record = await this.find(id);
    if (input.testCaseIds) {
      await this.testCases.ensureIds(record.projectId.toString(), input.testCaseIds);
      record.testCaseIds = input.testCaseIds.map((testCaseId) => asObjectId(testCaseId));
    }
    if (input.name !== undefined) record.name = input.name;
    if (input.description !== undefined) record.description = input.description;
    if (input.executionMode !== undefined) record.executionMode = input.executionMode;
    if (input.retryCount !== undefined) record.retryCount = input.retryCount;
    if (input.tags !== undefined) record.tags = input.tags;
    await record.save();
    return this.present(record);
  }

  async remove(id: string) {
    const record = await this.find(id);
    await record.deleteOne();
    return { deleted: true };
  }

  async ensureIds(projectId: string, ids: string[]) {
    const count = await this.suites.countDocuments({
      projectId: asObjectId(projectId),
      _id: { $in: ids.map((id) => asObjectId(id, "Test suite not found")) },
    });
    if (count !== ids.length) {
      throw new AppException("VALIDATION_ERROR", "One or more suites do not belong to this project", HttpStatus.BAD_REQUEST);
    }
  }

  private async find(id: string) {
    const record = await this.suites.findById(asObjectId(id, "Test suite not found"));
    if (!record) {
      throw new AppException("NOT_FOUND", "Test suite not found", HttpStatus.NOT_FOUND);
    }
    return record;
  }

  private present(record: TestSuiteDocument): TestSuiteView {
    return {
      id: record.id,
      projectId: record.projectId.toString(),
      name: record.name,
      description: record.description,
      testCaseIds: record.testCaseIds.map((id) => id.toString()),
      executionMode: record.executionMode,
      retryCount: record.retryCount,
      tags: record.tags,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}

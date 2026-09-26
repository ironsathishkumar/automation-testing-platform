import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CreateProjectInput, UpdateProjectInput } from "@atp/validation";
import { Project as ProjectView, ProjectDetail } from "@atp/shared-types";
import { Model, Types } from "mongoose";
import { AppException } from "../../common/app.exception";
import { asObjectId, isDuplicateKey } from "../../common/ids";
import { toResourceKey } from "../../common/slug";
import { AuditService } from "../audit/audit.service";
import { Application } from "../applications/application.schema";
import { Environment } from "../environments/environment.schema";
import { TestCase } from "../test-cases/test-case.schema";
import { TestPlan } from "../test-plans/test-plan.schema";
import { TestSuite } from "../test-suites/test-suite.schema";
import { Project, ProjectDocument } from "./project.schema";

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projects: Model<Project>,
    @InjectModel(Application.name) private readonly applications: Model<Application>,
    @InjectModel(Environment.name) private readonly environments: Model<Environment>,
    @InjectModel(TestCase.name) private readonly testCases: Model<TestCase>,
    @InjectModel(TestSuite.name) private readonly testSuites: Model<TestSuite>,
    @InjectModel(TestPlan.name) private readonly testPlans: Model<TestPlan>,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<ProjectView[]> {
    const projects = await this.projects.find().sort({ updatedAt: -1 });
    return projects.map((project) => this.present(project));
  }

  async get(id: string): Promise<ProjectDetail> {
    const project = await this.find(id);
    const projectId = project._id;
    const [applications, environments, testCases, suites, plans] = await Promise.all([
      this.applications.countDocuments({ projectId }),
      this.environments.countDocuments({ projectId }),
      this.testCases.countDocuments({ projectId }),
      this.testSuites.countDocuments({ projectId }),
      this.testPlans.countDocuments({ projectId }),
    ]);
    return {
      ...this.present(project),
      counts: { applications, environments, testCases, suites, plans },
    };
  }

  async create(input: CreateProjectInput, userId: string): Promise<ProjectView> {
    const key = input.key ? toResourceKey(input.key) : await this.availableKey(toResourceKey(input.name));
    try {
      const project = await this.projects.create({
        name: input.name,
        key,
        description: input.description ?? "",
        status: "active",
        createdBy: new Types.ObjectId(userId),
      });
      return this.present(project);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppException("CONFLICT", "A project with that key already exists", HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateProjectInput): Promise<ProjectView> {
    const project = await this.find(id);
    if (input.name !== undefined) project.name = input.name;
    if (input.description !== undefined) project.description = input.description;
    if (input.status !== undefined) project.status = input.status;
    if (input.key !== undefined) project.key = toResourceKey(input.key);
    try {
      await project.save();
      return this.present(project);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppException("CONFLICT", "A project with that key already exists", HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    const project = await this.find(id);
    const projectId = project._id;
    await Promise.all([
      this.applications.deleteMany({ projectId }),
      this.environments.deleteMany({ projectId }),
      this.testCases.deleteMany({ projectId }),
      this.testSuites.deleteMany({ projectId }),
      this.testPlans.deleteMany({ projectId }),
    ]);
    await project.deleteOne();
    await this.audit.record({
      userId,
      action: "project.delete",
      resourceType: "project",
      resourceId: id,
      metadata: { key: project.key },
    });
    return { deleted: true };
  }

  async ensure(id: string) {
    return this.find(id);
  }

  private async find(id: string) {
    const project = await this.projects.findById(asObjectId(id));
    if (!project) {
      throw new AppException("NOT_FOUND", "Project not found", HttpStatus.NOT_FOUND);
    }
    return project;
  }

  private async availableKey(base: string) {
    let key = base;
    let suffix = 2;
    while (await this.projects.exists({ key })) {
      key = `${base.slice(0, 28)}-${suffix}`;
      suffix += 1;
      if (suffix > 50) {
        throw new AppException("CONFLICT", "Could not create a unique project key", HttpStatus.CONFLICT);
      }
    }
    return key;
  }

  private present(project: ProjectDocument): ProjectView {
    return {
      id: project.id,
      name: project.name,
      key: project.key,
      description: project.description,
      status: project.status,
      createdBy: project.createdBy.toString(),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }
}

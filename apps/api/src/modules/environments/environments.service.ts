import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Environment as EnvironmentView } from "@atp/shared-types";
import { CreateEnvironmentInput, UpdateEnvironmentInput } from "@atp/validation";
import { Model } from "mongoose";
import { AppException } from "../../common/app.exception";
import { asObjectId } from "../../common/ids";
import { mergeVariables, presentVariables } from "../../common/secrets";
import { ProjectsService } from "../projects/projects.service";
import { Environment, EnvironmentDocument } from "./environment.schema";

@Injectable()
export class EnvironmentsService {
  constructor(
    @InjectModel(Environment.name) private readonly environments: Model<Environment>,
    private readonly projects: ProjectsService,
  ) {}

  async list(projectId: string): Promise<EnvironmentView[]> {
    await this.projects.ensure(projectId);
    const records = await this.environments.find({ projectId: asObjectId(projectId) }).sort({ name: 1 });
    return records.map((record) => this.present(record));
  }

  async get(id: string): Promise<EnvironmentView> {
    return this.present(await this.find(id));
  }

  async create(projectId: string, input: CreateEnvironmentInput): Promise<EnvironmentView> {
    await this.projects.ensure(projectId);
    const record = await this.environments.create({
      projectId: asObjectId(projectId),
      name: input.name,
      type: input.type,
      baseUrl: input.baseUrl,
      apiBaseUrl: input.apiBaseUrl,
      variables: input.variables,
      settings: input.settings ?? {},
    });
    return this.present(record);
  }

  async update(id: string, input: UpdateEnvironmentInput): Promise<EnvironmentView> {
    const record = await this.find(id);
    if (input.name !== undefined) record.name = input.name;
    if (input.type !== undefined) record.type = input.type;
    if (input.baseUrl !== undefined) record.baseUrl = input.baseUrl;
    if (input.apiBaseUrl !== undefined) record.apiBaseUrl = input.apiBaseUrl;
    if (input.settings !== undefined) record.settings = input.settings;
    if (input.variables !== undefined) {
      record.variables = mergeVariables(record.variables, input.variables);
      record.markModified("variables");
    }
    await record.save();
    return this.present(record);
  }

  async remove(id: string) {
    const record = await this.find(id);
    await record.deleteOne();
    return { deleted: true };
  }

  async ensureInProject(id: string, projectId: string) {
    const record = await this.find(id);
    if (record.projectId.toString() !== projectId) {
      throw new AppException("NOT_FOUND", "Environment not found", HttpStatus.NOT_FOUND);
    }
    return record;
  }

  private async find(id: string) {
    const record = await this.environments.findById(asObjectId(id, "Environment not found"));
    if (!record) {
      throw new AppException("NOT_FOUND", "Environment not found", HttpStatus.NOT_FOUND);
    }
    return record;
  }

  private present(record: EnvironmentDocument): EnvironmentView {
    return {
      id: record.id,
      projectId: record.projectId.toString(),
      name: record.name,
      type: record.type,
      baseUrl: record.baseUrl,
      apiBaseUrl: record.apiBaseUrl,
      variables: presentVariables(record.variables),
      settings: record.settings ?? {},
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}

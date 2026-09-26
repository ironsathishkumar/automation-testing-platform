import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Application as ApplicationView } from "@atp/shared-types";
import { CreateApplicationInput, UpdateApplicationInput } from "@atp/validation";
import { Model } from "mongoose";
import { AppException } from "../../common/app.exception";
import { asObjectId } from "../../common/ids";
import { ProjectsService } from "../projects/projects.service";
import { Application, ApplicationDocument } from "./application.schema";

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private readonly applications: Model<Application>,
    private readonly projects: ProjectsService,
  ) {}

  async list(projectId: string): Promise<ApplicationView[]> {
    await this.projects.ensure(projectId);
    const records = await this.applications.find({ projectId: asObjectId(projectId) }).sort({ name: 1 });
    return records.map((record) => this.present(record));
  }

  async get(id: string): Promise<ApplicationView> {
    return this.present(await this.find(id));
  }

  async create(projectId: string, input: CreateApplicationInput): Promise<ApplicationView> {
    await this.projects.ensure(projectId);
    const record = await this.applications.create({
      projectId: asObjectId(projectId),
      name: input.name,
      type: input.type,
      description: input.description ?? "",
      baseUrl: input.baseUrl,
      apiBaseUrl: input.apiBaseUrl,
      repository: input.repository,
    });
    return this.present(record);
  }

  async update(id: string, input: UpdateApplicationInput): Promise<ApplicationView> {
    const record = await this.find(id);
    Object.assign(record, input);
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
      throw new AppException("NOT_FOUND", "Application not found", HttpStatus.NOT_FOUND);
    }
    return record;
  }

  private async find(id: string) {
    const record = await this.applications.findById(asObjectId(id, "Application not found"));
    if (!record) {
      throw new AppException("NOT_FOUND", "Application not found", HttpStatus.NOT_FOUND);
    }
    return record;
  }

  private present(record: ApplicationDocument): ApplicationView {
    return {
      id: record.id,
      projectId: record.projectId.toString(),
      name: record.name,
      type: record.type,
      description: record.description,
      baseUrl: record.baseUrl,
      apiBaseUrl: record.apiBaseUrl,
      repository: record.repository,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}

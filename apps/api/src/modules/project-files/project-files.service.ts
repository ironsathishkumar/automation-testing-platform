import { randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { HttpStatus, Injectable, StreamableFile } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { PROJECT_FILE_CATEGORIES, ProjectFileText, ProjectFile as ProjectFileView } from "@atp/shared-types";
import { Model, Types } from "mongoose";
import { z } from "zod";
import { AppException } from "../../common/app.exception";
import { asObjectId } from "../../common/ids";
import { resolveInside } from "../../common/safe-path";
import { ProjectsService } from "../projects/projects.service";
import { isReadableText, outlineDocument } from "./document-outline";
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, mimeFor, safeFileName } from "./file-types";

const MAX_TEXT_BYTES = 1024 * 1024;
import { ProjectFile, ProjectFileDocument } from "./project-file.schema";

export interface UploadedBlob {
  originalname: string;
  size: number;
  buffer: Buffer;
}

const uploadFieldsSchema = z.object({
  category: z.enum(PROJECT_FILE_CATEGORIES).default("other"),
  note: z.string().trim().max(500).default(""),
});

@Injectable()
export class ProjectFilesService {
  constructor(
    @InjectModel(ProjectFile.name) private readonly files: Model<ProjectFile>,
    private readonly projects: ProjectsService,
    private readonly config: ConfigService,
  ) {}

  async list(projectId: string): Promise<ProjectFileView[]> {
    await this.projects.ensure(projectId);
    const records = await this.files.find({ projectId: asObjectId(projectId) }).sort({ createdAt: -1 });
    return records.map((record) => this.present(record));
  }

  async upload(projectId: string, file: UploadedBlob | undefined, fields: unknown, userId: string): Promise<ProjectFileView> {
    await this.projects.ensure(projectId);
    if (!file) throw new AppException("VALIDATION_ERROR", "Choose a file to upload", HttpStatus.BAD_REQUEST);
    const parsed = uploadFieldsSchema.safeParse(fields ?? {});
    if (!parsed.success) throw new AppException("VALIDATION_ERROR", "Invalid category or note", HttpStatus.BAD_REQUEST);
    const fileName = safeFileName(file.originalname);
    const mimeType = mimeFor(fileName);
    if (!mimeType) {
      throw new AppException("VALIDATION_ERROR", `This file type is not allowed. Use one of: ${ALLOWED_EXTENSIONS.join(", ")}`, HttpStatus.BAD_REQUEST);
    }
    if (file.size === 0) throw new AppException("VALIDATION_ERROR", "The file is empty", HttpStatus.BAD_REQUEST);
    if (file.size > MAX_UPLOAD_BYTES) throw new AppException("VALIDATION_ERROR", "Files must be 25 MB or smaller", HttpStatus.BAD_REQUEST);

    const storedName = `${randomUUID()}${path.extname(fileName).toLowerCase()}`;
    const directory = this.directoryFor(projectId);
    await mkdir(directory, { recursive: true });
    const absolute = resolveInside(directory, storedName);
    await writeFile(absolute, file.buffer, { flag: "wx" });
    try {
      const record = await this.files.create({
        projectId: asObjectId(projectId),
        fileName,
        storedName,
        category: parsed.data.category,
        note: parsed.data.note,
        mimeType,
        sizeBytes: file.size,
        uploadedBy: new Types.ObjectId(userId),
      });
      return this.present(record);
    } catch (error) {
      await unlink(absolute).catch(() => undefined);
      throw error;
    }
  }

  async open(id: string) {
    const record = await this.find(id);
    const absolute = resolveInside(this.directoryFor(record.projectId.toString()), record.storedName);
    if (!existsSync(absolute)) throw new AppException("NOT_FOUND", "The stored file is missing", HttpStatus.NOT_FOUND);
    return new StreamableFile(createReadStream(absolute), {
      type: record.mimeType,
      length: record.sizeBytes,
      disposition: `attachment; filename="${record.fileName.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(record.fileName)}`,
    });
  }

  async readText(id: string): Promise<ProjectFileText> {
    const record = await this.find(id);
    if (!isReadableText(record.fileName)) {
      throw new AppException(
        "VALIDATION_ERROR",
        "Only text documents (.md, .txt, .csv, .json, .yaml, .feature) can be opened here. Download this file to read it, or save it as Markdown or text.",
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (record.sizeBytes > MAX_TEXT_BYTES) {
      throw new AppException("VALIDATION_ERROR", "This document is too large to open here (limit 1 MB of text)", HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const absolute = resolveInside(this.directoryFor(record.projectId.toString()), record.storedName);
    if (!existsSync(absolute)) throw new AppException("NOT_FOUND", "The stored file is missing", HttpStatus.NOT_FOUND);
    const text = await readFile(absolute, "utf8");
    return { file: this.present(record), text, sections: outlineDocument(record.fileName, text) };
  }

  async remove(id: string) {
    const record = await this.find(id);
    const absolute = resolveInside(this.directoryFor(record.projectId.toString()), record.storedName);
    await record.deleteOne();
    await unlink(absolute).catch(() => undefined);
    return { deleted: true };
  }

  private directoryFor(projectId: string) {
    return resolveInside(this.config.getOrThrow<string>("DOCUMENT_ROOT"), asObjectId(projectId).toString());
  }

  private async find(id: string) {
    const record = await this.files.findById(asObjectId(id, "File not found"));
    if (!record) throw new AppException("NOT_FOUND", "File not found", HttpStatus.NOT_FOUND);
    return record;
  }

  private present(record: ProjectFileDocument): ProjectFileView {
    return {
      id: record.id,
      projectId: record.projectId.toString(),
      fileName: record.fileName,
      category: record.category,
      note: record.note,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      uploadedBy: record.uploadedBy.toString(),
      createdAt: record.createdAt.toISOString(),
    };
  }
}

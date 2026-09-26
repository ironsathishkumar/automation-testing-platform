import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { PROJECT_FILE_CATEGORIES, ProjectFileCategory } from "@atp/shared-types";
import { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class ProjectFile {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true })
  storedName!: string;

  @Prop({ required: true, enum: PROJECT_FILE_CATEGORIES, default: "other" })
  category!: ProjectFileCategory;

  @Prop({ default: "" })
  note!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  sizeBytes!: number;

  @Prop({ required: true, type: Types.ObjectId })
  uploadedBy!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ProjectFileDocument = HydratedDocument<ProjectFile>;
export const ProjectFileSchema = SchemaFactory.createForClass(ProjectFile);

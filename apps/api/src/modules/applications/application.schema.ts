import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ _id: false })
export class RepositoryMetadata {
  @Prop()
  url?: string;

  @Prop()
  branch?: string;

  @Prop()
  provider?: string;
}

const RepositorySchema = SchemaFactory.createForClass(RepositoryMetadata);

@Schema({ timestamps: true })
export class Application {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: ["web", "api", "mobile", "desktop", "service"] })
  type!: "web" | "api" | "mobile" | "desktop" | "service";

  @Prop({ default: "" })
  description!: string;

  @Prop()
  baseUrl?: string;

  @Prop()
  apiBaseUrl?: string;

  @Prop({ type: RepositorySchema })
  repository?: RepositoryMetadata;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ApplicationDocument = HydratedDocument<Application>;
export const ApplicationSchema = SchemaFactory.createForClass(Application);

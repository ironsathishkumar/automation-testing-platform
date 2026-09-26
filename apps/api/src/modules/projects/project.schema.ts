import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true })
  key!: string;

  @Prop({ default: "" })
  description!: string;

  @Prop({ required: true, enum: ["active", "archived"], default: "active" })
  status!: "active" | "archived";

  @Prop({ required: true, type: Types.ObjectId, ref: "User" })
  createdBy!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ProjectDocument = HydratedDocument<Project>;
export const ProjectSchema = SchemaFactory.createForClass(Project);

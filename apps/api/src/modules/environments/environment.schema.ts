import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ _id: false })
export class EnvironmentVariable {
  @Prop({ required: true })
  key!: string;

  @Prop({ required: true })
  value!: string;

  @Prop({ required: true, default: false })
  isSecret!: boolean;
}

const EnvironmentVariableSchema = SchemaFactory.createForClass(EnvironmentVariable);

@Schema({ timestamps: true })
export class Environment {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: ["local", "dev", "qa", "staging", "custom"] })
  type!: "local" | "dev" | "qa" | "staging" | "custom";

  @Prop()
  baseUrl?: string;

  @Prop()
  apiBaseUrl?: string;

  @Prop({ type: [EnvironmentVariableSchema], default: [] })
  variables!: EnvironmentVariable[];

  @Prop({ type: Object, default: {} })
  settings!: Record<string, unknown>;

  createdAt!: Date;
  updatedAt!: Date;
}

export type EnvironmentDocument = HydratedDocument<Environment>;
export const EnvironmentSchema = SchemaFactory.createForClass(Environment);

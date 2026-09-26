import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: { createdAt: true, updatedAt: true } })
export class AiRequest {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, enum: ["scenario", "test", "failure", "suggestion"] })
  kind!: "scenario" | "test" | "failure" | "suggestion";

  @Prop({ required: true })
  prompt!: string;

  @Prop({ type: Object })
  output?: unknown;

  @Prop({ required: true, enum: ["completed", "approved", "failed"], default: "completed" })
  status!: "completed" | "approved" | "failed";

  @Prop({ required: true, type: Types.ObjectId })
  createdBy!: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], default: [] })
  createdTestCaseIds!: Types.ObjectId[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type AiRequestDocument = HydratedDocument<AiRequest>;
export const AiRequestSchema = SchemaFactory.createForClass(AiRequest);

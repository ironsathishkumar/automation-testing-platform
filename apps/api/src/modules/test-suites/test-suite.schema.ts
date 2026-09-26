import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class TestSuite {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ type: [Types.ObjectId], default: [] })
  testCaseIds!: Types.ObjectId[];

  @Prop({ required: true, enum: ["sequential", "parallel"], default: "sequential" })
  executionMode!: "sequential" | "parallel";

  @Prop({ required: true, default: 0 })
  retryCount!: number;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type TestSuiteDocument = HydratedDocument<TestSuite>;
export const TestSuiteSchema = SchemaFactory.createForClass(TestSuite);

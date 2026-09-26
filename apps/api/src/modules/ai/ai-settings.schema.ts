import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ collection: "ai_settings", timestamps: true })
export class AiSettings {
  @Prop({ required: true, unique: true, default: "default" })
  scope!: string;

  @Prop({ required: true })
  baseUrl!: string;

  @Prop({ required: true })
  model!: string;

  @Prop({ default: "" })
  apiKey!: string;

  @Prop({ type: Types.ObjectId })
  updatedBy?: Types.ObjectId;

  updatedAt!: Date;
}

export type AiSettingsDocument = HydratedDocument<AiSettings>;
export const AiSettingsSchema = SchemaFactory.createForClass(AiSettings);

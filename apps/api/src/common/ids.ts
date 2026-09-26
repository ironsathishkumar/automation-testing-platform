import { HttpStatus } from "@nestjs/common";
import { Types } from "mongoose";
import { AppException } from "./app.exception";

export function asObjectId(id: string, message = "Record not found") {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppException("NOT_FOUND", message, HttpStatus.NOT_FOUND);
  }
  return new Types.ObjectId(id);
}

export function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000;
}

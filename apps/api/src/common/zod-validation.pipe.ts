import { Injectable, PipeTransform } from "@nestjs/common";
import { ZodError, ZodType } from "zod";
import { AppException } from "./app.exception";
import { HttpStatus } from "@nestjs/common";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw new AppException("VALIDATION_ERROR", "Invalid request", HttpStatus.BAD_REQUEST, this.details(result.error));
    }
    return result.data;
  }

  private details(error: ZodError) {
    return error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  }
}

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";
import { AppException } from "./app.exception";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = this.map(exception);
    if (mapped.status >= 500) {
      this.logger.error(mapped.message, exception instanceof Error ? exception.stack : undefined);
    }
    response.status(mapped.status).json({
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
        details: mapped.details,
      },
    });
  }

  private map(exception: unknown): { status: number; code: string; message: string; details: unknown[] } {
    if (exception instanceof AppException) {
      const body = exception.getResponse() as { code: string; message: string; details?: unknown[] };
      return {
        status: exception.getStatus(),
        code: body.code,
        message: body.message,
        details: body.details ?? [],
      };
    }

    if (this.isMongoDuplicate(exception)) {
      return { status: HttpStatus.CONFLICT, code: "CONFLICT", message: "A record with that value already exists", details: [] };
    }

    if (this.isCastError(exception)) {
      return { status: HttpStatus.NOT_FOUND, code: "NOT_FOUND", message: "Record not found", details: [] };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const message = typeof raw === "string" ? raw : "Request failed";
      return {
        status,
        code: status === HttpStatus.UNAUTHORIZED ? "AUTH_ERROR" : status === HttpStatus.NOT_FOUND ? "NOT_FOUND" : "INTERNAL_ERROR",
        message,
        details: [],
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "INTERNAL_ERROR",
      message: "Unexpected error",
      details: [],
    };
  }

  private isMongoDuplicate(exception: unknown) {
    return typeof exception === "object" && exception !== null && "code" in exception && (exception as { code: number }).code === 11000;
  }

  private isCastError(exception: unknown) {
    return exception instanceof Error && exception.name === "CastError";
  }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ originalUrl?: string; url?: string }>();
    const url = (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";
    if (/\/artifacts\/[a-fA-F0-9]{24}$/.test(url) || /\/files\/[a-fA-F0-9]{24}\/download$/.test(url)) {
      return next.handle();
    }
    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        data: data ?? null,
        message: "Success",
      })),
    );
  }
}

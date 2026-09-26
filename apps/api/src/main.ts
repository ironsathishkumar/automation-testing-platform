import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";
import { ResponseInterceptor } from "./common/response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string[]>("webOrigins"),
    credentials: true,
  });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swagger = new DocumentBuilder()
    .setTitle("Local Automation Testing Platform")
    .setDescription("Local API. Responses use { success, data, message }.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addCookieAuth("atp_token")
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swagger), { useGlobalPrefix: true });

  const host = config.get<string>("API_HOST") ?? "127.0.0.1";
  const port = config.get<number>("API_PORT") ?? 4000;
  await app.listen(port, host);
}

void bootstrap();

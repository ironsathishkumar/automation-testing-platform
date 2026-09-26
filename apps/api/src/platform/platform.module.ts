import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { WinstonModule } from "nest-winston";
import path from "node:path";
import { createWinstonOptions } from "../common/logger";
import { detectRepoRoot, loadAppConfig } from "../config/configuration";

const repoRoot = detectRepoRoot();

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.join(repoRoot, ".env"), path.join(repoRoot, ".env.development")],
      load: [() => loadAppConfig()],
    }),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createWinstonOptions(config.getOrThrow<string>("LOG_ROOT")),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>("MONGODB_URI"),
        serverSelectionTimeoutMS: 5000,
        retryAttempts: 8,
        retryDelay: 2000,
      }),
    }),
  ],
})
export class PlatformModule {}

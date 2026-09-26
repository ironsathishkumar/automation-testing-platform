import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectsModule } from "../projects/projects.module";
import { ProjectFile, ProjectFileSchema } from "./project-file.schema";
import { ProjectFilesController } from "./project-files.controller";
import { ProjectFilesService } from "./project-files.service";

@Module({
  imports: [ProjectsModule, MongooseModule.forFeature([{ name: ProjectFile.name, schema: ProjectFileSchema }])],
  controllers: [ProjectFilesController],
  providers: [ProjectFilesService],
  exports: [ProjectFilesService],
})
export class ProjectFilesModule {}

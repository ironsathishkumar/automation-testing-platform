import { Body, Controller, Delete, Get, Header, Param, Post, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";
import { AuthUser, CurrentUser } from "../../common/current-user.decorator";
import { MAX_UPLOAD_BYTES } from "./file-types";
import { ProjectFilesService, UploadedBlob } from "./project-files.service";

@ApiTags("project files")
@Controller()
export class ProjectFilesController {
  constructor(private readonly files: ProjectFilesService) {}

  @Get("projects/:projectId/files")
  list(@Param("projectId") projectId: string) {
    return this.files.list(projectId);
  }

  @Post("projects/:projectId/files")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 } }))
  upload(
    @Param("projectId") projectId: string,
    @UploadedFile() file: UploadedBlob | undefined,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.upload(projectId, file, body, user.id);
  }

  @Get("files/:id/download")
  @Header("X-Content-Type-Options", "nosniff")
  @Header("Content-Security-Policy", "sandbox")
  download(@Param("id") id: string): Promise<StreamableFile> {
    return this.files.open(id);
  }

  @Get("files/:id/text")
  text(@Param("id") id: string) {
    return this.files.readText(id);
  }

  @Delete("files/:id")
  remove(@Param("id") id: string) {
    return this.files.remove(id);
  }
}

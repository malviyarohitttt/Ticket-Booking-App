import {
  Controller,
  Get,
  ParseFilePipeBuilder,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import {
  StorageService,
  File,
  JwtAuthGuard,
  AccessGuard,
  AuthenticatedRequest,
} from '@Common';

@Controller()
export class AppController {
  constructor(private readonly storageService: StorageService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('test/current-user')
  currentUser(@Req() req: AuthenticatedRequest) {
    return req.user;
  }

  @ApiTags('Storage')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post('upload')
  upload(@UploadedFile(new ParseFilePipeBuilder().build()) file: File) {
    return {
      url: this.storageService.getFileUrl(file.filename),
      meta: {
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
      },
    };
  }
}

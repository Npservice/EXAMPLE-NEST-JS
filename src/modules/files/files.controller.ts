import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { FilesService } from './files.service.js';
import { SignedUrlGuard } from './guards/signed-url.guard.js';

function contentDisposition(filename: string): string {
  const escaped = filename.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `inline; filename="${escaped}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Public()
  @ResponseMessage('Signed URL berhasil dibuat')
  @Get('public/:id/data')
  getSignedUrlPublicData(@Param('id') id: string) {
    return this.filesService.generateSignedUrlPublic(id);
  }

  @Public()
  @Get('public/:id')
  async getPublicFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.filesService.findPublicById(id);
    const buffer = await this.filesService.getFileBuffer(file);
    res.set('Content-Type', file.mimeType ?? 'application/octet-stream');
    res.set('Content-Disposition', contentDisposition(file.nameFile));
    res.send(buffer);
  }

  @Public()
  @UseGuards(SignedUrlGuard)
  @Get('signed/:id')
  async getSignedFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.filesService.findById(id);
    const buffer = await this.filesService.getFileBuffer(file);
    res.set('Content-Type', file.mimeType ?? 'application/octet-stream');
    res.set('Content-Disposition', contentDisposition(file.nameFile));
    res.send(buffer);
  }

  @ResponseMessage('Upload Success')
  @UseInterceptors(FilesInterceptor('files'))
  @Post('store')
  uploadFile(@UploadedFiles() files: Express.Multer.File[]) {
    return this.filesService.uploadTemp(files ?? []);
  }

  @ResponseMessage('Signed URL berhasil dibuat')
  @Get(':id/signed-url')
  getSignedUrl(@Param('id') id: string) {
    return this.filesService.generateSignedUrl(id);
  }

  @Get(':id')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.filesService.findById(id);
    const buffer = await this.filesService.getFileBuffer(file);
    res.set('Content-Type', file.mimeType ?? 'application/octet-stream');
    res.set('Content-Disposition', contentDisposition(file.nameFile));
    res.send(buffer);
  }
}

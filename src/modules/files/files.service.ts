import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateSignedUrl } from '../../common/utils/signed-url.util.js';
import { type FileStatus, FileEntity } from './entities/file.entity.js';

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.xlsx',
  '.docx',
]);

const SIGNED_URL_TTL_MS = 2 * 60 * 1000;

const DOCUMENT_TYPE_BY_EXT: Record<string, string> = {
  doc: 'word',
  docx: 'word',
  docm: 'word',
  dot: 'word',
  dotx: 'word',
  odt: 'word',
  rtf: 'word',
  txt: 'word',
  xls: 'cell',
  xlsx: 'cell',
  xlsm: 'cell',
  xlt: 'cell',
  xltx: 'cell',
  csv: 'cell',
  ods: 'cell',
  ppt: 'slide',
  pptx: 'slide',
  pps: 'slide',
  ppsx: 'slide',
  odp: 'slide',
  pdf: 'pdf',
};

export interface UploadedFileResult {
  id: string;
  filename: string;
}

export interface SignedUrlResult {
  url: string;
  key: string;
  title: string;
  file_type: string;
  document_type: string;
}

@Injectable()
export class FilesService {
  private readonly tempDir: string;
  private readonly storageDir: string;
  private readonly baseUrl: string;
  private readonly signedUrlSecret: string;

  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepository: Repository<FileEntity>,
    private readonly configService: ConfigService,
  ) {
    this.tempDir = this.configService.get('FILE_TEMP_DIR', './storage/temp');
    this.storageDir = this.configService.get(
      'FILE_STORAGE_DIR',
      './storage/files',
    );
    this.baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    this.signedUrlSecret = this.configService.get('SIGNED_URL_SECRET', '');
  }

  async uploadTemp(
    files: Express.Multer.File[],
  ): Promise<UploadedFileResult[]> {
    await mkdir(this.tempDir, { recursive: true });

    const results: UploadedFileResult[] = [];

    for (const file of files) {
      const ext = extname(file.originalname).toLowerCase();

      if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new UnsupportedMediaTypeException('unsupported file type');
      }

      const id = randomUUID();
      const path = join(this.tempDir, `${randomUUID()}${ext}`);
      await writeFile(path, file.buffer);

      const entity = this.filesRepository.create({
        id,
        nameFile: file.originalname,
        path,
        ext,
        size: String(file.size),
        mimeType: file.mimetype,
        isTemp: 1,
        status: 'private',
      });
      await this.filesRepository.save(entity);

      results.push({ id, filename: file.originalname });
    }

    return results;
  }

  async findById(id: string): Promise<FileEntity> {
    const file = await this.filesRepository.findOne({ where: { id } });

    if (!file) {
      throw new NotFoundException('File tidak ditemukan');
    }

    return file;
  }

  async findPublicById(id: string): Promise<FileEntity> {
    const file = await this.filesRepository.findOne({
      where: { id, status: 'public' },
    });

    if (!file) {
      throw new NotFoundException('File tidak ditemukan');
    }

    return file;
  }

  getFileBuffer(file: FileEntity) {
    return readFile(file.path);
  }

  async deleteFile(id: string) {
    const file = await this.filesRepository.findOne({ where: { id } });

    if (!file) {
      return;
    }

    await rm(file.path, { force: true });
    await this.filesRepository.delete({ id });
  }

  async rollbackFile(id: string, status: FileStatus) {
    return this.moveFile(id, false, status);
  }

  async moveToStorage(id: string, status: FileStatus) {
    return this.moveFile(id, true, status);
  }

  private async moveFile(id: string, toStorage: boolean, status: FileStatus) {
    const file = await this.filesRepository.findOne({ where: { id } });

    if (!file) {
      throw new NotFoundException('File tidak ditemukan');
    }

    const destDir = toStorage ? this.storageDir : this.tempDir;
    await mkdir(destDir, { recursive: true });

    const ext = extname(file.path);
    const newPath = join(destDir, `${randomUUID()}${ext}`);

    await rename(file.path, newPath);

    file.path = newPath;
    file.isTemp = toStorage ? 0 : 1;
    file.status = status;
    return this.filesRepository.save(file);
  }

  async generateSignedUrl(id: string): Promise<SignedUrlResult> {
    const file = await this.findById(id);
    return this.buildSignedResult(id, file);
  }

  async generateSignedUrlPublic(id: string): Promise<SignedUrlResult> {
    const file = await this.findPublicById(id);
    return this.buildSignedResult(id, file);
  }

  private buildSignedResult(id: string, file: FileEntity): SignedUrlResult {
    if (!this.signedUrlSecret) {
      throw new Error('SIGNED_URL_SECRET belum di-set');
    }

    const fileUrl = `${this.baseUrl.replace(/\/$/, '')}/files/signed/${id}`;
    const url = generateSignedUrl(
      fileUrl,
      SIGNED_URL_TTL_MS,
      this.signedUrlSecret,
    );

    const ext = file.ext?.replace(/^\./, '').toLowerCase() ?? '';

    return {
      url,
      key: `doc-${id}-${Date.now()}`,
      title: file.nameFile,
      file_type: ext,
      document_type: DOCUMENT_TYPE_BY_EXT[ext] ?? 'word',
    };
  }
}

import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { validateSignedUrl } from '../../../common/utils/signed-url.util.js';

@Injectable()
export class SignedUrlGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const baseUrl = this.configService
      .get('APP_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
    const fullUrl = `${baseUrl}${request.originalUrl}`;
    const secret = this.configService.get('SIGNED_URL_SECRET', '');

    if (!secret || !validateSignedUrl(fullUrl, secret)) {
      throw new ForbiddenException('Invalid or expired URL');
    }

    return true;
  }
}

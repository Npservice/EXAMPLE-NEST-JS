import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponse {
  status: 'FAILED';
  code: number;
  message: string;
  data: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionHandler');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const code = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    let message = isHttpException
      ? this.extractMessage(exception)
      : 'Internal server error';

    if (!isHttpException) {
      const error = exception as Error;
      this.logger.error(
        `${request.method} ${request.url} - ${error?.message}`,
        error?.stack,
      );
    }

    // Route tidak ada: router Nest melempar "Cannot GET /...".
    if (code === 404 && message.startsWith('Cannot ')) {
      message = `Endpoint ${request.method} ${request.originalUrl} tidak ditemukan`;
    }

    const body: ErrorResponse = {
      status: 'FAILED',
      code,
      message,
      data: isHttpException ? this.extractData(exception) : null,
    };
    response.status(code).json(body);
  }

  private extractMessage(exception: HttpException): string {
    const body = exception.getResponse();

    if (typeof body === 'string') {
      return body;
    }

    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as { message: string | string[] }).message;
      return Array.isArray(message) ? message.join(', ') : message;
    }

    return exception.message;
  }

  /** Detail error per field, mis. `{ email: 'email sudah terdaftar' }`. */
  private extractData(exception: HttpException): unknown {
    const body = exception.getResponse();
    return typeof body === 'object' && body !== null && 'data' in body
      ? body.data
      : null;
  }
}

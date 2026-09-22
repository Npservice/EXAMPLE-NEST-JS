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
  status: 'error';
  code: number;
  message: string;
  data: null;
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
    const message = isHttpException
      ? this.extractMessage(exception)
      : 'Internal server error';

    if (!isHttpException) {
      const error = exception as Error;
      this.logger.error(
        `${request.method} ${request.url} - ${error?.message}`,
        error?.stack,
      );
    }

    const body: ErrorResponse = { status: 'error', code, message, data: null };
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
}

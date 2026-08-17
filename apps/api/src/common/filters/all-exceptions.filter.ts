import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

export interface ErrorBody {
  statusCode: number;
  message: string;
  error?: string;
  code?: string;
  details?: unknown;
}

/** Structured error responses: { statusCode, message, error, code?, details? }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const body: ErrorBody =
        typeof res === 'string'
          ? { statusCode: status, message: res, error: exception.name }
          : {
              statusCode: status,
              message: (res as { message?: string }).message ?? exception.message,
              error: exception.name,
              details: (res as { details?: unknown }).details,
            };
      return void response.status(status).json(body);
    }

    const err = exception as Error;
    this.logger.error(
      `Unhandled: ${err.message ?? 'unknown error'}\n${err.stack ?? ''}`,
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    } satisfies ErrorBody);
  }
}
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  localizeMessages,
  resolveRequestLocale,
} from './http-exception.filter';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('UnhandledException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const locale = resolveRequestLocale(request);

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string | string[];
      let error: string;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        const body = exceptionResponse as Record<string, any>;
        message = body.message ?? exception.message;
        error = body.error ?? exception.name;
      }

      const localized = localizeMessages(message, locale, status);
      const suppliedCode = typeof exceptionResponse === 'object' && exceptionResponse
        ? (exceptionResponse as Record<string, any>).code
        : undefined;

      response.status(status).json({
        statusCode: status,
        code: suppliedCode || localized.code,
        error,
        message: localized.message,
        locale,
        path: request.originalUrl,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const stack = exception instanceof Error ? exception.stack : String(exception);
    this.logger.error(
      `Unhandled exception on ${request.method} ${request.originalUrl}`,
      stack,
    );

    const localized = localizeMessages(
      'An unexpected error occurred. Please try again later.',
      locale,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: localized.code,
      error: locale === 'ar' ? 'خطأ داخلي في الخادم' : 'Internal Server Error',
      message: localized.message,
      locale,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}

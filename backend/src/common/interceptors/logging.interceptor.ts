import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const requestId = request.headers['x-request-id'] || randomUUID();
    request.requestId = requestId;
    const { method, originalUrl } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const latency = Date.now() - start;
        const userId = request.user?.id ?? 'anonymous';
        this.logger.log(
          JSON.stringify({
            requestId,
            method,
            path: originalUrl,
            statusCode: response.statusCode,
            latencyMs: latency,
            userId,
          }),
        );
      }),
    );
  }
}

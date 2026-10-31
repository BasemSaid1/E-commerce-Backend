import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CachingService } from '../caching.service.js';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(private readonly redisService: CachingService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    if (request.method !== 'GET') return next.handle();

    const cacheKey = `cache:${request.originalUrl || request.url}`;

    try {
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        return of(JSON.parse(cachedData));
      }
    } catch (error) {
      this.logger.error('Error retrieving data from Redis', error);
    }

    return next.handle().pipe(
      tap((data) => {
        if (data === undefined || data === null) return;

        // fire-and-forget: مش بنستنى Redis قبل ما نرد على الـ client
        this.redisService
          .set(cacheKey, JSON.stringify(data), 360)
          .catch((error) =>
            this.logger.error('Error storing data in Redis', error),
          );
      }),
    );
  }
}

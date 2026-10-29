import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { log } from 'console';
import { of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CachingService } from '../caching.service.js';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly redisService: CachingService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();

    if (request.method !== 'GET') return next.handle();

    const cacheKey = `cache:${request.originalUrl || request.url}`;

    try {
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        return of(JSON.parse(cachedData));
      }
    } catch (error) {
      console.error('Error retrieving data from Redis:', error);
    }

    return next.handle().pipe(
      map(async (data) => {
        try {
          if (data) {
            await this.redisService.set(cacheKey, JSON.stringify(data), 360);
          }
        } catch (error) {
          console.error('Error storing data in Redis:', error);
        }
        return data;
      }),
    );
  }
}

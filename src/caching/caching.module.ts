import { Global, Module } from '@nestjs/common';
import { CachingService } from './caching.service.js';
import { CacheInterceptor } from './interceptors/http-cache.interceptor.js';

@Global()
@Module({
  providers: [CachingService, CacheInterceptor],
  exports: [CachingService, CacheInterceptor],
})
export class CachingModule {}

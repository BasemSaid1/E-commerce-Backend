import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CachingService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  onModuleInit() {
    this.client = new Redis(process.env.REDIS_HOST || 'redis://127.0.0.1:6379');

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<string> {
    return await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const [next, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== '0');
  }

  async invalidateProducts(): Promise<void> {
    try {
      await this.delByPattern('cache:/product*');
    } catch (error) {
      console.error('Failed to invalidate products cache:', error);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}

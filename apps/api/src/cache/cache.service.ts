import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

export const CACHE_KEY_PREFIX = 'fb:';

/**
 * Read-through cache backed by Upstash Redis (REST).
 *
 * - Enabled only when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
 *   are set (the canonical Upstash env var names, read via `Redis.fromEnv()`).
 * - Disabled (no-op) otherwise — no behavior change without Redis.
 * - Keys are namespaced with `fb:` to stay isolated from other apps.
 * - Values use the SDK's automatic JSON serialization (native JS types).
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;

  constructor(config: ConfigService) {
    const url = config.get<string>('UPSTASH_REDIS_REST_URL');
    const token = config.get<string>('UPSTASH_REDIS_REST_TOKEN');
    if (url && token) {
      this.client = Redis.fromEnv();
      this.logger.log('Upstash Redis cache enabled');
    } else {
      this.client = null;
      this.logger.log(
        'Upstash Redis cache DISABLED (set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to enable)',
      );
    }
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      return await this.client.get<T>(`${CACHE_KEY_PREFIX}${key}`);
    } catch (err) {
      this.logger.warn(`Cache get failed for ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(`${CACHE_KEY_PREFIX}${key}`, value, {
        ex: ttlSeconds,
      });
    } catch (err) {
      this.logger.warn(`Cache set failed for ${key}: ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(`${CACHE_KEY_PREFIX}${key}`);
    } catch (err) {
      this.logger.warn(`Cache del failed for ${key}: ${(err as Error).message}`);
    }
  }

  /** Delete every key matching `prefix*` (SCAN + DEL). */
  async delByPrefix(prefix: string): Promise<void> {
    if (!this.client) return;
    const pattern = `${CACHE_KEY_PREFIX}${prefix}*`;
    try {
      let cursor: string = '0';
      do {
        const [next, keys] = await this.client.scan(cursor, {
          match: pattern,
          count: 100,
        });
        if (keys.length > 0) await this.client.del(...keys);
        cursor = next as string;
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(
        `Cache delByPrefix failed for ${pattern}: ${(err as Error).message}`,
      );
    }
  }
}
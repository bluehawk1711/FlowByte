import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

export const CACHE_KEY_PREFIX = 'fb:';

/** Redis-friendly JSON serialization (skips functions/undefined silently). */
function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * Read-through cache backed by Upstash Redis (REST).
 *
 * - Disabled (no-op) when REDIS_URL/REDIS_TOKEN are not configured.
 * - Keys are namespaced with `fb:` to stay isolated from other apps.
 * - Values are JSON strings; dates are NOT stored (API responses are
 *   JSON-safe after mapping).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    const token = config.get<string>('REDIS_TOKEN');
    if (url && token) {
      this.client = new Redis({ url, token });
      this.logger.log('Upstash Redis cache enabled');
    } else {
      this.client = null;
      this.logger.log(
        'Upstash Redis cache DISABLED (set REDIS_URL + REDIS_TOKEN to enable)',
      );
    }
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(`${CACHE_KEY_PREFIX}${key}`);
      if (raw === null) return null;
      return JSON.parse(raw as string) as T;
    } catch (err) {
      this.logger.warn(`Cache get failed for ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    const serialized = safeStringify(value);
    if (serialized === null) return;
    try {
      await this.client.set(`${CACHE_KEY_PREFIX}${key}`, serialized, {
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

  onModuleDestroy(): void {
    // REST client keeps an HTTP agent alive; nothing to close explicitly.
  }
}

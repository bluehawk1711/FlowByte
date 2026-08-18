import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Global caching module (Phase 11 — Upstash Redis).
 *
 * Enabled only when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set
 * (canonical Upstash env var names, read by `Redis.fromEnv()`).
 * When unset, CacheService is a no-op and behavior is unchanged.
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}

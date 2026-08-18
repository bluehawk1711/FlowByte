import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Global caching module (Phase 11 — Upstash Redis).
 *
 * Enabled only when REDIS_URL + REDIS_TOKEN are set (Upstash REST config).
 * When unset, CacheService is a no-op and behavior is unchanged.
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}

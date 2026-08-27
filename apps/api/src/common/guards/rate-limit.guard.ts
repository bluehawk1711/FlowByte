import { CanActivate, ExecutionContext, HttpException, Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory sliding window rate limiter.
 * Usage: @UseGuards(RateLimitGuard) on controller methods.
 * Configure via static create() or @RateLimit decorator.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly keyFn: (req: Request) => string;

  constructor(opts: { windowMs: number; maxRequests: number; keyFn?: (req: Request) => string }) {
    this.windowMs = opts.windowMs;
    this.maxRequests = opts.maxRequests;
    this.keyFn = opts.keyFn ?? ((req) => req.ip ?? req.socket.remoteAddress ?? 'unknown');
  }

  static forAuth() {
    return new RateLimitGuard({ windowMs: 15 * 60 * 1000, maxRequests: 20 });
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = this.keyFn(req);
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    entry.count++;
    if (entry.count > this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        { message: 'Too many requests', retryAfter },
        429,
      );
    }
    return true;
  }
}

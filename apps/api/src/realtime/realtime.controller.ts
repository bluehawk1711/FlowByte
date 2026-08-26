import { Controller, Get, Logger, Query, Sse, UnauthorizedException, type MessageEvent } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Observable, finalize, map } from 'rxjs';
import { Public } from '../common/decorators/public.decorator';
import { RealtimeService } from './realtime.service';
import type { AccessTokenPayload } from '../common/guards/jwt-auth.guard';

@ApiTags('realtime')
@Controller('realtime')
export class RealtimeController {
  private readonly logger = new Logger(RealtimeController.name);

  constructor(
    private readonly realtime: RealtimeService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * SSE endpoint. Clients connect here with ?token=<jwt>.
   * EventSource cannot set custom headers, so the JWT is passed as a query param.
   * The connection stays open and receives events as they happen.
   *
   * Events emitted:
   *   library:changed — { type, songId?, playlistId? }
   *   playback:changed — { songId, position, isPlaying, deviceId }
   */
  @Public()
  @Get('events')
  @Sse('events')
  events(@Query('token') token: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let cleanup: (() => void) | undefined;
      let closed = false;

      this.verifyToken(token)
        .then((userId) => {
          if (closed) return;
          const { observable, cleanup: unsub } = this.realtime.subscribe(userId);
          cleanup = unsub;

          const sub = observable
            .pipe(
              map(
                (event): MessageEvent => ({
                  id: Date.now().toString(),
                  type: event.event,
                  data: event.data as string | object,
                }),
              ),
            )
            .subscribe(subscriber);

          return () => sub.unsubscribe();
        })
        .catch((err) => {
          if (!closed) subscriber.error(err);
        });

      return () => {
        closed = true;
        cleanup?.();
      };
    });
  }

  private async verifyToken(token: string | undefined): Promise<string> {
    if (!token) throw new UnauthorizedException('Missing token');
    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: process.env.JWT_SECRET,
    });
    if (payload.type !== 'access') throw new UnauthorizedException('Not an access token');
    return payload.sub;
  }
}

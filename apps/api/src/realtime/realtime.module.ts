import { Global, Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { RealtimeController } from './realtime.controller';

/**
 * Global module — inject RealtimeService anywhere to push SSE events.
 * The controller exposes the /realtime/events SSE endpoint.
 */
@Global()
@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { devices, type Device as DbDevice } from '../db/schema';
import type { Device } from '@flowbyte/types';
import type { RegisterDeviceDto } from './dto/register-device.dto';

export function mapDevice(row: DbDevice): Device {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    platform: row.platform,
    lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class DevicesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async register(userId: string, dto: RegisterDeviceDto): Promise<Device> {
    const [existing] = await this.db
      .select()
      .from(devices)
      .where(and(eq(devices.userId, userId), eq(devices.name, dto.name)))
      .limit(1);
    if (existing) {
      const [updated] = await this.db
        .update(devices)
        .set({ lastSeenAt: new Date(), platform: dto.platform })
        .where(eq(devices.id, existing.id))
        .returning();
      return mapDevice(updated ?? existing);
    }
    const [row] = await this.db
      .insert(devices)
      .values({ userId, name: dto.name, platform: dto.platform, lastSeenAt: new Date() })
      .returning();
    if (!row) throw new Error('Failed to register device');
    return mapDevice(row);
  }

  async touch(deviceId: string): Promise<void> {
    await this.db.update(devices).set({ lastSeenAt: new Date() }).where(eq(devices.id, deviceId));
  }

  async listForUser(userId: string): Promise<Device[]> {
    const rows = await this.db.select().from(devices).where(eq(devices.userId, userId));
    return rows.map(mapDevice);
  }

  async remove(userId: string, deviceId: string): Promise<void> {
    const [row] = await this.db
      .select()
      .from(devices)
      .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Device not found');
    await this.db.delete(devices).where(eq(devices.id, deviceId));
  }
}
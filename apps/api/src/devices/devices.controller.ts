import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { Device } from '@flowbyte/types';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Register (or re-register) the current device' })
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto): Promise<Device> {
    return this.devicesService.register(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all devices for the current user' })
  list(@CurrentUser() user: AuthUser): Promise<Device[]> {
    return this.devicesService.listForUser(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a device' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.devicesService.remove(user.id, id);
  }
}
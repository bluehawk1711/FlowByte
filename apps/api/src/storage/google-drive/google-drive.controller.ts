import { Controller, Get, Delete, Put, Query, Res, UseGuards, Body, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GoogleDriveService } from './google-drive.service';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import type { CloudConnectionStatus } from './google-drive.service';

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage/google-drive')
export class GoogleDriveController {
  private readonly logger = new Logger(GoogleDriveController.name);

  constructor(private readonly googleDriveService: GoogleDriveService) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Get Google Drive OAuth consent URL' })
  getAuthUrl(@CurrentUser() user: AuthUser): { url: string } {
    const url = this.googleDriveService.getAuthUrl(user.id);
    return { url };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle Google Drive OAuth callback' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.googleDriveService.handleCallback(code, state);
      // Redirect to a success page or close the window
      res.redirect('flowbyte://auth-success?provider=google-drive');
    } catch (err) {
      this.logger.error(`Google Drive callback failed: ${err}`);
      res.redirect('flowbyte://auth-error?provider=google-drive');
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Google Drive connection status' })
  getStatus(@CurrentUser() user: AuthUser): Promise<CloudConnectionStatus> {
    return this.googleDriveService.getStatus(user.id);
  }

  @Delete('disconnect')
  @ApiOperation({ summary: 'Disconnect Google Drive' })
  disconnect(@CurrentUser() user: AuthUser): Promise<void> {
    return this.googleDriveService.disconnect(user.id);
  }

  @Get('default-provider')
  @ApiOperation({ summary: 'Get default storage provider' })
  getDefaultProvider(@CurrentUser() user: AuthUser): Promise<{ provider: string }> {
    return this.googleDriveService.getDefaultProvider(user.id).then((p) => ({ provider: p }));
  }

  @Put('default-provider')
  @ApiOperation({ summary: 'Set default storage provider' })
  setDefaultProvider(
    @CurrentUser() user: AuthUser,
    @Body() body: { provider: string },
  ): Promise<void> {
    return this.googleDriveService.setDefaultProvider(user.id, body.provider);
  }
}

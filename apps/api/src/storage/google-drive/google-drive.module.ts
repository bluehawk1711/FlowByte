import { Module } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { GoogleDriveController } from './google-drive.controller';
import { GoogleDriveStorage } from '../google-drive.provider';

@Module({
  controllers: [GoogleDriveController],
  providers: [GoogleDriveService, GoogleDriveStorage],
  exports: [GoogleDriveService, GoogleDriveStorage],
})
export class GoogleDriveModule {}

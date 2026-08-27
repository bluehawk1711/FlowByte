import { Global, Logger, Module } from '@nestjs/common';
import path from 'node:path';
import { BackblazeB2Storage } from './backblaze-b2.provider';
import { LocalStorageProvider } from './local-storage.provider';
import { STORAGE_PROVIDER, type StorageProvider } from './storage-provider.interface';

/**
 * Provides the StorageProvider implementation selected by STORAGE_PROVIDER
 * env var ('local' default, or 'backblaze'). The rest of the app only ever
 * depends on the interface.
 */
@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (): StorageProvider => {
        const logger = new Logger('StorageProvider');
        const provider = process.env.STORAGE_PROVIDER ?? 'local';
        if (provider === 'backblaze') {
          const b2 = new BackblazeB2Storage();
          return b2;
        }
        const root =
          process.env.LOCAL_STORAGE_PATH ??
          path.resolve(__dirname, '..', '..', '..', '..', 'storage');
        return new LocalStorageProvider(root);
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}

export { STORAGE_PROVIDER };
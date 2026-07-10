import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageService } from './storage.service';

@Module({
  imports: [CommonModule],
  controllers: [FilesController],
  providers: [FilesService, StorageService],
  exports: [StorageService],
})
export class FilesModule {}

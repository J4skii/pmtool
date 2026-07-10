import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { SheetImportController } from './sheet-import.controller';
import { SheetImportService } from './sheet-import.service';

@Module({
  imports: [CommonModule],
  controllers: [SheetImportController],
  providers: [SheetImportService],
  exports: [SheetImportService],
})
export class SheetImportModule {}

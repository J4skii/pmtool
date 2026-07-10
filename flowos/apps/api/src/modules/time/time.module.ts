import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { TimeController } from './time.controller';
import { TimeService } from './time.service';

@Module({
  imports: [CommonModule],
  controllers: [TimeController],
  providers: [TimeService],
})
export class TimeModule {}

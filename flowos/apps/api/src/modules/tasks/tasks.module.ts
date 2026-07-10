import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [CommonModule, RealtimeModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

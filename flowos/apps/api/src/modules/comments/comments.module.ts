import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [CommonModule, RealtimeModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}

import { Global, Module } from '@nestjs/common';
import { EmailProcessor } from './email.processor';
import { QueuesService } from './queues.service';

@Global()
@Module({
  providers: [QueuesService, EmailProcessor],
  exports: [QueuesService],
})
export class QueuesModule {}

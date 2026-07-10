import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export type RealtimeEvent = 'task.updated' | 'task.created' | 'comment.created' | 'notification.created';

/**
 * Thin emitter other modules inject to broadcast realtime events without
 * depending on the gateway. Rooms: `tenant:{id}` and `project:{id}`.
 */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  /** Called once by RealtimeGateway.afterInit(). */
  setServer(server: Server): void {
    this.server = server;
  }

  emitToTenant(tenantId: string, event: RealtimeEvent, payload: unknown): void {
    this.server?.to(`tenant:${tenantId}`).emit(event, payload);
  }

  emitToProject(projectId: string, event: RealtimeEvent, payload: unknown): void {
    this.server?.to(`project:${projectId}`).emit(event, payload);
  }

  emitToUser(tenantId: string, userId: string, event: RealtimeEvent, payload: unknown): void {
    this.server?.to(`tenant:${tenantId}:user:${userId}`).emit(event, payload);
  }
}

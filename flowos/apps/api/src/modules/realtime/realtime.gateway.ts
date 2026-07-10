import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { prisma } from '@flowos/database';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../../common/types';
import { RealtimeService } from './realtime.service';

interface AuthedSocket extends Socket {
  data: { user?: JwtPayload };
}

/**
 * Socket.io gateway. Clients authenticate the handshake with
 * `auth: { token: <accessToken> }`; on success they join their tenant room
 * and a per-user room. Project rooms are joined on demand via
 * `project:join` after a membership check.
 */
@WebSocketGateway({
  cors: { origin: process.env.APP_URL ?? 'http://localhost:3000', credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.realtimeService.setServer(server);
  }

  async handleConnection(client: AuthedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('missing token');
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET ?? '',
      });
      client.data.user = payload;
      await client.join(`tenant:${payload.tenantId}`);
      await client.join(`tenant:${payload.tenantId}:user:${payload.sub}`);
    } catch {
      this.logger.warn(`Rejected websocket connection ${client.id}: invalid handshake token`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('project:join')
  async handleProjectJoin(client: AuthedSocket, projectId: string): Promise<{ ok: boolean }> {
    const user = client.data.user;
    if (!user || typeof projectId !== 'string') return { ok: false };
    // Only allow joining projects that belong to the caller's tenant.
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!project) return { ok: false };
    await client.join(`project:${projectId}`);
    return { ok: true };
  }

  @SubscribeMessage('project:leave')
  async handleProjectLeave(client: AuthedSocket, projectId: string): Promise<{ ok: boolean }> {
    if (typeof projectId !== 'string') return { ok: false };
    await client.leave(`project:${projectId}`);
    return { ok: true };
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown>;
    const fromAuth = auth['token'];
    if (typeof fromAuth === 'string' && fromAuth.length > 0) return fromAuth;
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}

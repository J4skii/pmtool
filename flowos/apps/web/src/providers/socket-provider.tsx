'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { AppNotification } from '@/lib/types';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

interface TaskUpdatedPayload {
  taskId: string;
  projectId: string;
}

interface CommentCreatedPayload {
  entityType: string;
  entityId: string;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(API_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('task.updated', (payload: TaskUpdatedPayload) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', payload.projectId] });
      void queryClient.invalidateQueries({ queryKey: ['task', payload.taskId] });
    });

    socket.on('comment.created', (payload: CommentCreatedPayload) => {
      void queryClient.invalidateQueries({
        queryKey: ['comments', payload.entityType, payload.entityId],
      });
    });

    socket.on('notification.created', (payload: AppNotification) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast(payload.title, { description: payload.body ?? undefined });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [accessToken, queryClient]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

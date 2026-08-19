import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from './logger.ts';

let io: Server;

/**
 * @param server       — Node HTTP server instance
 * @param allowedOrigins — list of allowed CORS origins (from server.ts config)
 */
export const initSocket = (server: HttpServer, allowedOrigins: string[]) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

export const emitEvent = (event: string, data: unknown): void => {
  if (io) io.emit(event, data);
};

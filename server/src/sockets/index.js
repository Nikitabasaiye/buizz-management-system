const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.id}`);

    // Join user-specific room
    socket.join(`user:${socket.user.id}`);

    // Join organizer room if organizer
    if (socket.user.role === 'organizer') {
      socket.join(`organizer:${socket.user.organizationId}`);
    }

    // Join event room
    socket.on('join:event', (eventId) => {
      socket.join(`event:${eventId}`);
      logger.info(`User ${socket.user.id} joined event:${eventId}`);
    });

    // Leave event room
    socket.on('leave:event', (eventId) => {
      socket.leave(`event:${eventId}`);
      logger.info(`User ${socket.user.id} left event:${eventId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };

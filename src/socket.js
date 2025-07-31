const { Server } = require('socket.io');

/**
 * Initialize Socket.io on the given HTTP server.
 * @param {import('http').Server} server
 */
function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // يمكنك تقييد الأصل في الإنتاج
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    // عند استقبال رسالة من أحد العملاء
    socket.on('chat:message', (msg) => {
      const payload = {
        id: Date.now(),
        user: msg.user || 'anonymous',
        text: msg.text,
      };
      // بثّها للجميع (بما فيهم المرسل)
      io.emit('chat:message', payload);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id);
    });
  });

  return io;
}

module.exports = { initSocket };


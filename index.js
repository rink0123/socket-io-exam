const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('./model/index');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  pingInterval: 25000,
  pingTimeout: 20000,
  connectTimeout: 45000,
});

io.adapter(createAdapter(pubClient, subClient));

const socketKeysLog = (io, socket) => {
  console.log(JSON.stringify({ socketKeys: Array.from(io.sockets.sockets.keys()), socketId: socket.id }));
};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  socket.emit('res_connection', socket.id);
  console.log(JSON.stringify({ res_connection: { socketId: socket.id } }));

  const interval = setInterval(() => {
    if (socket.connected) socketKeysLog(io, socket);
    else clearInterval(interval);
  }, 1000);

  socket.on('disconnect', () => console.log(JSON.stringify({ disconnect: { socketId: socket.id, isDisconnected: socket.disconnected } }), '\n'));

  socket.on('req_resume_socket_id', (oldSocketId) => {
    console.log({ currentSocketId: socket.id, oldSocketId });
    const socketToDisconnect = io.sockets.sockets.get(oldSocketId);
    if (socketToDisconnect) {
      socketToDisconnect.disconnect();
      console.log(`Socket ${oldSocketId} disconnected by the server`);

      socket.id = oldSocketId;
      console.log(`Socket ${socket.id} migration by the server`);
    } else {
      console.log(`Socket ${oldSocketId} not found`);
    }

    socket.emit('res_resume_socket_id', oldSocketId);

    console.log('########### resume_socket_id');
    socketKeysLog(io, socket);
    console.log('########### resume_socket_id', '\n');
  });
});

(async () => {
  await pubClient.connect();
  await pubClient.flushAll();
  console.log('Redis connect after data initialization');
  httpServer.listen(3000, () => console.log(`Listening on port: ${3000}\n`));
})();

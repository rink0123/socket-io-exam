const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('./model/index');
const dayjs = require('./dayjs');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  pingInterval: 25000,
  pingTimeout: 20000,
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.adapter(createAdapter(pubClient, subClient));

io.on('connection', async (socket) => {
  const socketId = socket.id;
  const startDatetime = dayjs();

  const interval = setInterval(async () => {
    if (socket.connected) {
      let _sockets = (await io.fetchSockets()).map((row) => ({ socketId: row.id, isConnected: socket.connected }));
      console.log(`fetchSockets: ${JSON.stringify(_sockets)}\n`);
    } else {
      clearInterval(interval);
      console.log(`socketId: ${socketId}, isConnected: ${socket.connected}\n`);
    }
  }, 1000);

  socket.on('disconnect', () => {
    console.log(
      `disconnect: ${JSON.stringify({ socketId, isConnected: socket.connected, disconnectTime: dayjs().diff(startDatetime, 'second', true) })}\n`
    );
  });

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });
});

(async () => {
  await pubClient.connect();
  await pubClient.flushAll();
  console.log('Redis connect after data initialization');
  httpServer.listen(4000, () => console.log(`Listening on port: ${4000}\n`));
})();

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
  connectTimeout: 45000,
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.adapter(createAdapter(pubClient, subClient));

io.on('connection', async (socket) => {
  socket.emit('res_connection', socket.id);

  let socketId = socket.id;
  let startDatetime = dayjs();

  let interval = setInterval(async () => {
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

  socket.on('resumeSession', async (oldSocketId) => {
    let duplSocketIds = (await io.fetchSockets()).filter((ele) => ele.id === oldSocketId);
    console.log(duplSocketIds.map((row) => row.id));
    for (let i = 0; i < duplSocketIds.length - 1; i++) {
      duplSocketIds[i].disconnect();
    }

    socket.id = oldSocketId;
    socketId = socket.id;
    console.log('resumeSession: ', { socketId });
  });

  socket.on('chat', (msg) => {
    console.log(`chat: ${JSON.stringify({ socketId, msg })}`);
    socket.emit('chat', msg);
  });
});

(async () => {
  await pubClient.connect();
  await pubClient.flushAll();
  console.log('Redis connect after data initialization');
  httpServer.listen(3000, () => console.log(`Listening on port: ${3000}\n`));
})();

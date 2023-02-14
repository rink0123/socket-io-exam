const { createClient } = require('redis');

const pubClient = createClient({ socket: { host: 'localhost', port: 6379 } }).on('error', (err) => console.error('redis pubClient', err.stack));
const subClient = pubClient.duplicate().on('error', (err) => console.error('redis subClient', err.stack));

module.exports = { pubClient, subClient };

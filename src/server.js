require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log('Server running on', PORT));

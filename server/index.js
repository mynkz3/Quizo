require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

const sessionRoutes = require('./routes/sessionRoutes');
const roomHandler = require('./socket/roomHandler');
const stateHandler = require('./socket/stateHandler');
const scoringHandler = require('./socket/scoringHandler');

const app = express();

// Socket.io needs to share the underlying HTTP server with Express,
// so we create the server explicitly instead of using app.listen().
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    // Open origin so participants can connect from phones on the LAN
    // (origin is http://<host-ip>:5173, not localhost). Fine for local use.
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Quiz Platform API is running' });
});

app.use('/api/sessions', sessionRoutes);

io.on('connection', (socket) => {
  roomHandler(io, socket);      // join / kick / disconnect
  stateHandler(io, socket);     // start game, advance slides, leaderboard
  scoringHandler(io, socket);   // answers, scoring, Q&A
});

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

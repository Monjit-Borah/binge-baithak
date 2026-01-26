require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');

// Initialize app
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/watch-party')
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error(' MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../client'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Watch Party Server',
    timestamp: new Date(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Room routes
app.get('/api/rooms/:roomId', (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  res.json({
    exists: true,
    roomId: roomId,
    message: 'Room exists'
  });
});

// Load socket handlers
require('./socket')(io);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving client files from: ../client`);
});

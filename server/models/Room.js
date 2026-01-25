const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  videoUrl: {
    type: String,
    default: ''
  },
  currentTime: {
    type: Number,
    default: 0
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  hostSocketId: {
    type: String,
    required: true
  },
  hostUsername: {
    type: String,
    required: true
  },
  users: [{
    socketId: String,
    username: String,
    joinedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Auto-delete after 24 hours
  }
});

module.exports = mongoose.model('Room', roomSchema);
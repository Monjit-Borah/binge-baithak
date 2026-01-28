const Room = require('../models/Room');

exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({
      roomId: room.roomId,
      hostUsername: room.hostUsername,
      userCount: room.users.length,
      videoUrl: room.videoUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { roomId, username } = req.body;
    
    // Check if room already exists
    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return res.status(400).json({ error: 'Room already exists' });
    }
    
    res.json({ 
      success: true, 
      message: 'Room can be created via socket connection' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    await Room.deleteOne({ roomId: req.params.roomId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
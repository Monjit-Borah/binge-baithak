const Room = require('./models/Room');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // User joins a room
    socket.on('join-room', async ({ roomId, username }) => {
      try {
        // Join socket room
        socket.join(roomId);
        
        // Find or create room
        let room = await Room.findOne({ roomId });
        const isNewRoom = !room;
        
        if (!room) {
          // Create new room with this user as host
          room = new Room({
            roomId,
            hostSocketId: socket.id,
            hostUsername: username,
            users: [{
              socketId: socket.id,
              username,
              joinedAt: new Date()
            }]
          });
        } else {
          // Add user to existing room
          room.users.push({
            socketId: socket.id,
            username,
            joinedAt: new Date()
          });
        }
        
        await room.save();
        
        // Send current room state to the new user
        socket.emit('room-state', {
          videoUrl: room.videoUrl,
          currentTime: room.currentTime,
          isPlaying: room.isPlaying,
          isHost: socket.id === room.hostSocketId,
          hostUsername: room.hostUsername
        });
        
        // Notify others in the room
        socket.to(roomId).emit('user-joined', {
          username,
          userId: socket.id
        });
        
        // Send updated user list to everyone
        const users = room.users.map(user => ({
          username: user.username,
          userId: user.socketId
        }));
        
        io.to(roomId).emit('user-list', users);
        
        console.log(`${username} joined room ${roomId}`);
        
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', 'Failed to join room');
      }
    });

    // Host video control events
    socket.on('video-play', async ({ roomId, currentTime }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room || room.hostSocketId !== socket.id) return;
        
        room.isPlaying = true;
        room.currentTime = currentTime;
        await room.save();
        
        socket.to(roomId).emit('video-play', { currentTime });
      } catch (error) {
        console.error('Error handling play:', error);
      }
    });

    socket.on('video-pause', async ({ roomId, currentTime }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room || room.hostSocketId !== socket.id) return;
        
        room.isPlaying = false;
        room.currentTime = currentTime;
        await room.save();
        
        socket.to(roomId).emit('video-pause', { currentTime });
      } catch (error) {
        console.error('Error handling pause:', error);
      }
    });

    socket.on('video-seek', async ({ roomId, currentTime }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room || room.hostSocketId !== socket.id) return;
        
        room.currentTime = currentTime;
        await room.save();
        
        socket.to(roomId).emit('video-seek', { currentTime });
      } catch (error) {
        console.error('Error handling seek:', error);
      }
    });

    socket.on('video-change', async ({ roomId, videoUrl }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room || room.hostSocketId !== socket.id) return;
        
        room.videoUrl = videoUrl;
        room.currentTime = 0;
        await room.save();
        
        io.to(roomId).emit('video-change', { videoUrl });
      } catch (error) {
        console.error('Error changing video:', error);
      }
    });

    // Chat messages
    socket.on('send-message', ({ roomId, username, message }) => {
      const messageData = {
        username,
        message,
        timestamp: new Date().toISOString(),
        userId: socket.id
      };
      
      io.to(roomId).emit('receive-message', messageData);
    });

    // User disconnects
    socket.on('disconnect', async () => {
      try {
        // Find room containing this user
        const room = await Room.findOne({ 
          'users.socketId': socket.id 
        });
        
        if (room) {
          // Remove user from room
          room.users = room.users.filter(user => user.socketId !== socket.id);
          
          // If host left, assign new host
          if (room.hostSocketId === socket.id && room.users.length > 0) {
            room.hostSocketId = room.users[0].socketId;
            room.hostUsername = room.users[0].username;
            
            io.to(room.roomId).emit('new-host', {
              username: room.hostUsername
            });
          }
          
          // If no users left, delete room
          if (room.users.length === 0) {
            await Room.deleteOne({ roomId: room.roomId });
          } else {
            await room.save();
            
            // Send updated user list
            const users = room.users.map(user => ({
              username: user.username,
              userId: user.socketId
            }));
            
            io.to(room.roomId).emit('user-list', users);
            socket.to(room.roomId).emit('user-left', {
              userId: socket.id
            });
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
};
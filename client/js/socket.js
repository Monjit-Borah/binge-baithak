class SocketManager {
    constructor() {
        this.socket = null;
        this.listeners = {};
        this.roomId = null;
        this.username = null;
        this.isHost = false;
    }

    // Connect to server
    connect() {
        this.socket = io();
        
        // Set up event listeners
        this.setupEventListeners();
        
        return new Promise((resolve) => {
            this.socket.on('connect', () => {
                console.log('Connected to server:', this.socket.id);
                resolve();
            });
        });
    }

    // Join a room
    joinRoom(roomId, username) {
        this.roomId = roomId;
        this.username = username;
        
        this.socket.emit('join-room', { roomId, username });
    }

    // Set up socket event listeners
    setupEventListeners() {
        // Room state received when joining
        this.socket.on('room-state', (data) => {
            this.isHost = data.isHost;
            this.trigger('room-state', data);
        });

        // Video control events
        this.socket.on('video-play', (data) => {
            this.trigger('video-play', data);
        });

        this.socket.on('video-pause', (data) => {
            this.trigger('video-pause', data);
        });

        this.socket.on('video-seek', (data) => {
            this.trigger('video-seek', data);
        });

        this.socket.on('video-change', (data) => {
            this.trigger('video-change', data);
        });

        // Chat events
        this.socket.on('receive-message', (data) => {
            this.trigger('receive-message', data);
        });

        // User events
        this.socket.on('user-joined', (data) => {
            this.trigger('user-joined', data);
        });

        this.socket.on('user-left', (data) => {
            this.trigger('user-left', data);
        });

        this.socket.on('user-list', (data) => {
            this.trigger('user-list', data);
        });

        this.socket.on('new-host', (data) => {
            this.isHost = true;
            this.trigger('new-host', data);
        });

        // Error handling
        this.socket.on('error', (error) => {
            this.trigger('error', error);
        });
    }

    // Send video control events (only host can send these)
    sendVideoPlay(currentTime) {
        if (this.isHost) {
            this.socket.emit('video-play', { 
                roomId: this.roomId, 
                currentTime 
            });
        }
    }

    sendVideoPause(currentTime) {
        if (this.isHost) {
            this.socket.emit('video-pause', { 
                roomId: this.roomId, 
                currentTime 
            });
        }
    }

    sendVideoSeek(currentTime) {
        if (this.isHost) {
            this.socket.emit('video-seek', { 
                roomId: this.roomId, 
                currentTime 
            });
        }
    }

    sendVideoChange(videoUrl) {
        if (this.isHost) {
            this.socket.emit('video-change', { 
                roomId: this.roomId, 
                videoUrl 
            });
        }
    }

    // Send chat message
    sendChatMessage(message) {
        this.socket.emit('send-message', {
            roomId: this.roomId,
            username: this.username,
            message: message
        });
    }

    // Event subscription system
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    trigger(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    // Disconnect
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Create singleton instance
const socketManager = new SocketManager();
class RoomManager {
    constructor() {
        this.player = null;
        this.isHost = false;
        this.roomId = null;
        this.username = null;
        
        // Extract room and user from URL
        this.extractUrlParams();
        
        // Initialize managers
        this.socket = socketManager;
        this.ui = new UIManager(this);
        
        // Set up event listeners
        this.setupEventListeners();
    }

    extractUrlParams() {
        const params = new URLSearchParams(window.location.search);
        this.roomId = params.get('room');
        this.username = params.get('user') || 'Anonymous';
        
        if (!this.roomId) {
            alert('No room specified. Redirecting to lobby.');
            window.location.href = 'index.html';
        }
    }

    async init() {
        try {
            // Connect to socket server
            await this.socket.connect();
            
            // Join the room
            this.socket.joinRoom(this.roomId, this.username);
            
            // Set up YouTube Player
            this.setupYouTubePlayer();
            
            // Update UI
            this.ui.updateRoomCode(this.roomId);
            this.ui.updateUsername(this.username);
            
        } catch (error) {
            console.error('Failed to initialize room:', error);
            alert('Failed to connect to the server. Please try again.');
        }
    }

    setupYouTubePlayer() {
        // This function will be called by YouTube IFrame API
        window.onYouTubeIframeAPIReady = () => {
            this.player = new YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                events: {
                    'onReady': this.onPlayerReady.bind(this),
                    'onStateChange': this.onPlayerStateChange.bind(this)
                }
            });
        };

        // Load YouTube IFrame API if not already loaded
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }

    onPlayerReady(event) {
        console.log('YouTube player ready');
        this.ui.enableControls(this.isHost);
        
        // If we have a stored video URL from room state, load it
        if (this.initialVideoUrl) {
            this.loadVideo(this.initialVideoUrl);
        }
    }

    onPlayerStateChange(event) {
        // Don't emit events if we're syncing from server
        if (this.isSyncing) return;
        
        const currentTime = this.player.getCurrentTime();
        
        switch (event.data) {
            case YT.PlayerState.PLAYING:
                if (this.isHost && !this.isSyncing) {
                    this.socket.sendVideoPlay(currentTime);
                }
                this.ui.updatePlaybackState(true);
                break;
                
            case YT.PlayerState.PAUSED:
                if (this.isHost && !this.isSyncing) {
                    this.socket.sendVideoPause(currentTime);
                }
                this.ui.updatePlaybackState(false);
                break;
                
            case YT.PlayerState.BUFFERING:
                // Handle buffering if needed
                break;
        }
        
        // Update time display
        this.updateTimeDisplay();
    }

    setupEventListeners() {
        // Socket events
        this.socket.on('room-state', (data) => {
            this.handleRoomState(data);
        });

        this.socket.on('video-play', (data) => {
            this.syncVideoPlay(data);
        });

        this.socket.on('video-pause', (data) => {
            this.syncVideoPause(data);
        });

        this.socket.on('video-seek', (data) => {
            this.syncVideoSeek(data);
        });

        this.socket.on('video-change', (data) => {
            this.loadVideo(data.videoUrl);
        });

        this.socket.on('receive-message', (data) => {
            this.ui.addMessage(data);
        });

        this.socket.on('user-list', (users) => {
            this.ui.updateUserList(users);
        });

        this.socket.on('new-host', (data) => {
            this.isHost = true;
            this.ui.updateHostStatus(true);
            alert(`You are now the host!`);
        });

        this.socket.on('user-joined', (data) => {
            this.ui.showSystemMessage(`${data.username} joined the room`);
        });

        this.socket.on('user-left', (data) => {
            this.ui.removeUser(data.userId);
        });

        this.socket.on('error', (error) => {
            alert(`Error: ${error}`);
        });
    }

    handleRoomState(data) {
        this.isHost = data.isHost;
        this.initialVideoUrl = data.videoUrl;
        
        this.ui.updateHostStatus(this.isHost);
        this.ui.updateUserCount(1); // Initial count
        
        if (data.videoUrl) {
            this.loadVideo(data.videoUrl);
        }
        
        if (this.player && this.player.getPlayerState) {
            this.syncToTime(data.currentTime);
            
            if (data.isPlaying && this.player.getPlayerState() !== YT.PlayerState.PLAYING) {
                this.player.playVideo();
            } else if (!data.isPlaying && this.player.getPlayerState() === YT.PlayerState.PLAYING) {
                this.player.pauseVideo();
            }
        }
    }

    syncVideoPlay(data) {
        this.isSyncing = true;
        
        if (this.player && this.player.getPlayerState) {
            const currentTime = this.player.getCurrentTime();
            const timeDiff = Math.abs(currentTime - data.currentTime);
            
            // Only sync if there's a significant time difference
            if (timeDiff > 2) {
                this.player.seekTo(data.currentTime, true);
            }
            
            if (this.player.getPlayerState() !== YT.PlayerState.PLAYING) {
                this.player.playVideo();
            }
        }
        
        setTimeout(() => {
            this.isSyncing = false;
        }, 100);
        
        this.ui.updatePlaybackState(true);
    }

    syncVideoPause(data) {
        this.isSyncing = true;
        
        if (this.player && this.player.getPlayerState) {
            const currentTime = this.player.getCurrentTime();
            const timeDiff = Math.abs(currentTime - data.currentTime);
            
            if (timeDiff > 2) {
                this.player.seekTo(data.currentTime, true);
            }
            
            if (this.player.getPlayerState() !== YT.PlayerState.PAUSED) {
                this.player.pauseVideo();
            }
        }
        
        setTimeout(() => {
            this.isSyncing = false;
        }, 100);
        
        this.ui.updatePlaybackState(false);
    }

    syncVideoSeek(data) {
        this.isSyncing = true;
        
        if (this.player && this.player.seekTo) {
            this.player.seekTo(data.currentTime, true);
        }
        
        setTimeout(() => {
            this.isSyncing = false;
        }, 100);
    }

    syncToTime(time) {
        if (this.player && this.player.seekTo) {
            this.player.seekTo(time, true);
        }
    }

    loadVideo(videoUrl) {
        if (!this.player || !this.player.loadVideoById) return;
        
        let videoId = this.extractYouTubeId(videoUrl);
        
        if (!videoId) {
            alert('Invalid YouTube URL');
            return;
        }
        
        this.player.loadVideoById(videoId);
        this.ui.updateCurrentVideo(videoUrl);
    }

    extractYouTubeId(url) {
        // Handle various YouTube URL formats
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : url;
    }

    updateTimeDisplay() {
        if (!this.player) return;
        
        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();
        
        this.ui.updateTimeDisplay(currentTime, duration);
        
        // Update seek bar
        if (duration > 0) {
            const percentage = (currentTime / duration) * 100;
            this.ui.updateSeekBar(percentage);
        }
    }

    seekVideo(percentage) {
        if (!this.player || !this.isHost) return;
        
        const duration = this.player.getDuration();
        const seekTime = (percentage / 100) * duration;
        
        this.socket.sendVideoSeek(seekTime);
        this.player.seekTo(seekTime, true);
    }
}

class UIManager {
    constructor(roomManager) {
        this.roomManager = roomManager;
        this.setupUIListeners();
    }

    setupUIListeners() {
        // Video controls
        document.getElementById('loadVideoBtn').addEventListener('click', () => {
            const url = document.getElementById('videoUrl').value;
            if (url) {
                this.roomManager.socket.sendVideoChange(url);
            }
        });

        document.getElementById('playBtn').addEventListener('click', () => {
            if (this.roomManager.player) {
                const currentTime = this.roomManager.player.getCurrentTime();
                this.roomManager.socket.sendVideoPlay(currentTime);
                this.roomManager.player.playVideo();
            }
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            if (this.roomManager.player) {
                const currentTime = this.roomManager.player.getCurrentTime();
                this.roomManager.socket.sendVideoPause(currentTime);
                this.roomManager.player.pauseVideo();
            }
        });

        document.getElementById('seekBar').addEventListener('input', (e) => {
            const percentage = e.target.value;
            this.roomManager.seekVideo(percentage);
        });

        // Chat
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Leave room
        document.getElementById('leaveBtn').addEventListener('click', () => {
            if (confirm('Leave this watch party?')) {
                window.location.href = 'index.html';
            }
        });
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (message) {
            this.roomManager.socket.sendChatMessage(message);
            input.value = '';
        }
    }

    updateRoomCode(roomCode) {
        document.getElementById('roomCode').textContent = `Room: ${roomCode}`;
    }

    updateUsername(username) {
        document.title = `${username}'s Watch Party`;
    }

    updateHostStatus(isHost) {
        const statusElement = document.getElementById('userStatus');
        statusElement.textContent = isHost ? 'Host' : 'Viewer';
        statusElement.style.background = isHost ? '#43b581' : '#7289da';
    }

    updateUserCount(count) {
        document.getElementById('userCount').textContent = `👤 ${count}`;
    }

    enableControls(isHost) {
        const controls = [
            'loadVideoBtn',
            'playBtn',
            'pauseBtn',
            'seekBar',
            'videoUrl'
        ];
        
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = !isHost;
                element.style.opacity = isHost ? '1' : '0.5';
                element.style.cursor = isHost ? 'pointer' : 'not-allowed';
            }
        });
    }

    updatePlaybackState(isPlaying) {
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (isPlaying) {
            playBtn.style.opacity = '0.5';
            pauseBtn.style.opacity = '1';
        } else {
            playBtn.style.opacity = '1';
            pauseBtn.style.opacity = '0.5';
        }
    }

    updateTimeDisplay(currentTime, duration) {
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        document.getElementById('timeDisplay').textContent = 
            `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }

    updateSeekBar(percentage) {
        document.getElementById('seekBar').value = percentage;
    }

    updateCurrentVideo(url) {
        document.getElementById('videoUrl').value = url;
    }

    addMessage(data) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        const time = new Date(data.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageElement.innerHTML = `
            <div class="username">${data.username}</div>
            <div class="message">${this.escapeHtml(data.message)}</div>
            <div class="timestamp">${time}</div>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showSystemMessage(message) {
        this.addMessage({
            username: 'System',
            message: message,
            timestamp: new Date().toISOString()
        });
    }

    updateUserList(users) {
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user.username;
            li.dataset.userId = user.userId;
            
            // Mark host
            if (user.userId === this.roomManager.socket.socket.id) {
                li.classList.add('host');
                li.innerHTML = '👑 ' + user.username + ' (You)';
            }
            
            usersList.appendChild(li);
        });
        
        this.updateUserCount(users.length);
    }

    removeUser(userId) {
        const userElement = document.querySelector(`[data-user-id="${userId}"]`);
        if (userElement) {
            userElement.remove();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const roomManager = new RoomManager();
    window.roomManager = roomManager; // Make accessible for debugging
    roomManager.init();
});
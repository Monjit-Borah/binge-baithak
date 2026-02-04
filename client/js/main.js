document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username');
    const roomIdInput = document.getElementById('roomId');
    const joinBtn = document.getElementById('joinBtn');
    const createBtn = document.getElementById('createBtn');
    const errorDiv = document.getElementById('error');

    // Load username from localStorage if exists
    const savedUsername = localStorage.getItem('watchPartyUsername');
    if (savedUsername) {
        usernameInput.value = savedUsername;
    }

    // Validate inputs
    function validateInputs() {
        const username = usernameInput.value.trim();
        const roomId = roomIdInput.value.trim();

        if (!username) {
            showError('Please enter your name');
            return false;
        }

        if (username.length > 20) {
            showError('Name must be less than 20 characters');
            return false;
        }

        if (roomId && roomId.length > 10) {
            showError('Room code must be less than 10 characters');
            return false;
        }

        // Save username to localStorage
        localStorage.setItem('watchPartyUsername', username);

        return { username, roomId };
    }

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
        setTimeout(() => errorDiv.classList.remove('show'), 3000);
    }

    // Generate a random room ID
    function generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Redirect to room page
    function goToRoom(roomId, username) {
        const params = new URLSearchParams({
            room: roomId,
            user: username
        });
        window.location.href = `room.html?${params.toString()}`;
    }

    // Join existing room
    joinBtn.addEventListener('click', () => {
        const validated = validateInputs();
        if (!validated) return;

        const { username, roomId } = validated;
        
        if (!roomId) {
            showError('Please enter a room code');
            return;
        }

        // Check if room exists (optional - can be done in socket connection)
        goToRoom(roomId, username);
    });

    // Create new room
    createBtn.addEventListener('click', () => {
        const validated = validateInputs();
        if (!validated) return;

        const { username } = validated;
        const roomId = generateRoomId();
        
        goToRoom(roomId, username);
    });

    // Allow Enter key to submit
    roomIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinBtn.click();
        }
    });
});
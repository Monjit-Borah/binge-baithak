const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Check if room exists
router.get('/:roomId', roomController.getRoom);

// Create a new room
router.post('/', roomController.createRoom);

// Delete a room
router.delete('/:roomId', roomController.deleteRoom);

module.exports = router;
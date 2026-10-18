const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const playerController = require('../controllers/player.controller');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for CSV uploads
const uploadCsv = multer({ 
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Configure multer for player photo image uploads
const playerImagesDir = path.join(uploadsDir, 'player-images');
if (!fs.existsSync(playerImagesDir)) {
  fs.mkdirSync(playerImagesDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, playerImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `player-${uniqueSuffix}${ext}`);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// --- Routes ---

// Create a single player (supports optional photo upload)
router.post('/', uploadImage.single('photo'), playerController.createPlayer);

// Upload players from CSV
router.post('/upload', uploadCsv.single('file'), playerController.uploadPlayers);

// Get random unsold player (must be before /:playerId)
router.get('/random', playerController.getRandomPlayer);

// Get all unsold players (must be before /:playerId)
router.get('/unsold', playerController.getUnsoldPlayers);

// Delete all players (auction reset - must be before /:playerId)
router.delete('/', playerController.deleteAllPlayers);

// Get all players
router.get('/', playerController.getAllPlayers);

// Get single player by ID
router.get('/:playerId', playerController.getPlayerById);

// Update player (PUT & PATCH, supports optional photo upload)
router.put('/:playerId', uploadImage.single('photo'), playerController.updatePlayer);
router.patch('/:playerId', uploadImage.single('photo'), playerController.updatePlayer);

// Delete single player
router.delete('/:playerId', playerController.deletePlayer);

// Assign player to team
router.post('/:playerId/assign', playerController.assignPlayer);

// Mark player as unsold
router.post('/:playerId/unsold', playerController.markUnsold);

// Remove player from team
router.delete('/:playerId/remove-from-team', playerController.removePlayerFromTeam);

module.exports = router;
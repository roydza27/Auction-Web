const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const teamController = require('../controllers/team.controller');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for team logos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `team-logo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for team logos'));
    }
  }
});

// Create new team
router.post('/', upload.single('logo'), teamController.createTeam);

// Get final results (must be before /:teamId to avoid conflict)
router.get('/results/final', teamController.getFinalResults);

// Delete all teams (for auction reset - must be before /:teamId)
router.delete('/', teamController.deleteAllTeams);

// Update team
router.put('/:teamId', upload.single('logo'), teamController.updateTeam);

// Update team (PATCH - same as PUT)
router.patch('/:teamId', upload.single('logo'), teamController.updateTeam);

// Delete single team
router.delete('/:teamId', teamController.deleteTeam);

// Get all teams
router.get('/', teamController.getAllTeams);

// Get team by ID
router.get('/:teamId', teamController.getTeamById);

module.exports = router;
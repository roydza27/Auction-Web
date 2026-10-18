const express = require('express');
const router = express.Router();
const bidController = require('../controllers/bid.controller');

// Place an accepted bid on a player
router.post('/place', bidController.placeBid);

// Finalize sale of player to winning franchise
router.post('/finalize-sale', bidController.finalizeSale);

// Mark player as unsold
router.post('/unsold', bidController.markUnsold);

// Undo last accepted bid on a player (Rollback / Back action)
router.post('/undo-last', bidController.undoLastBid);

// Get all bids for a player
router.get('/player/:playerId', bidController.getPlayerBids);

module.exports = router;

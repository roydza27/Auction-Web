const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    index: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 10000
  },
  bidNumber: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Compound index for querying bids per player in chronological order
bidSchema.index({ player: 1, bidNumber: 1 });
bidSchema.index({ player: 1, timestamp: -1 });

module.exports = mongoose.model('Bid', bidSchema);

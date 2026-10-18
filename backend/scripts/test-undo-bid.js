const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Player = require('../models/player.model');
const Team = require('../models/team.model');
const Bid = require('../models/bid.model');
const bidController = require('../controllers/bid.controller');
const assert = require('assert');

async function testUndo() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected!');

  try {
    const teams = await Team.find({}).limit(2);
    const teamA = teams[0];
    const teamB = teams[1];

    const testPlayer = await Player.findOne({ status: 'available' });
    assert(testPlayer, 'Must have test player');

    // Clean up
    await Bid.deleteMany({ player: testPlayer._id });

    // Bid 1: 10,000 by Team A
    await new Bid({
      player: testPlayer._id,
      team: teamA._id,
      amount: 10000,
      bidNumber: 1
    }).save();

    // Bid 2: 12,000 by Team B
    await new Bid({
      player: testPlayer._id,
      team: teamB._id,
      amount: 12000,
      bidNumber: 2
    }).save();

    console.log('✓ Placed 2 test bids: 10k (Team A) and 12k (Team B)');

    // Mock Express req/res for undo
    const createMockReqRes = () => {
      let result = null;
      let statusCode = 200;
      return {
        req: {
          body: { playerId: testPlayer._id.toString() },
          app: { get: () => null }
        },
        res: {
          status(code) { statusCode = code; return this; },
          json(data) { result = data; return this; }
        },
        getResult: () => ({ statusCode, result })
      };
    };

    // 1. Undo Bid #2
    const mock1 = createMockReqRes();
    await bidController.undoLastBid(mock1.req, mock1.res);
    const res1 = mock1.getResult();
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.result.currentBid, 10000, 'Current bid must revert to 10k');
    assert.strictEqual(res1.result.nextBid, 12000, 'Next bid must be 12k');
    assert.strictEqual(res1.result.highestBidder._id.toString(), teamA._id.toString(), 'Team A must be leader again');
    console.log('✓ Undoing Bid #2 correctly restored Team A at 10,000 pts');

    // 2. Undo Bid #1 (Opening Bid)
    const mock2 = createMockReqRes();
    await bidController.undoLastBid(mock2.req, mock2.res);
    const res2 = mock2.getResult();
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.result.currentBid, 0, 'Current bid must revert to 0');
    assert.strictEqual(res2.result.nextBid, 10000, 'Next bid must be base price 10k');
    assert.strictEqual(res2.result.highestBidder, null, 'Highest bidder must be null');
    console.log('✓ Undoing Bid #1 correctly restored Base Price 10,000 with no leader');

    // 3. Try to undo when no bids exist
    const mock3 = createMockReqRes();
    await bidController.undoLastBid(mock3.req, mock3.res);
    const res3 = mock3.getResult();
    assert.strictEqual(res3.statusCode, 400);
    console.log('✓ Attempting undo on 0 bids rejected with 400');

    // Cleanup
    await Bid.deleteMany({ player: testPlayer._id });
    console.log('🎉 ALL UNDO / BACK UNIT & INTEGRATION TESTS PASSED!');
  } finally {
    await mongoose.disconnect();
  }
}

testUndo().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

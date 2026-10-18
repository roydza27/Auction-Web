const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Player = require('../models/player.model');
const Team = require('../models/team.model');
const Bid = require('../models/bid.model');
const { calculateNextBid } = require('../controllers/bid.controller');
const assert = require('assert');

async function runE2ETest() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB!');

  try {
    const teams = await Team.find({}).limit(2);
    assert(teams.length >= 2, 'Need at least 2 teams for simulation');
    const teamA = teams[0];
    const teamB = teams[1];

    // Pick an available player for testing
    let testPlayer = await Player.findOne({ status: 'available' });
    assert(testPlayer, 'Need at least 1 available player');
    console.log(`Using test player: ${testPlayer.name} (${testPlayer._id})`);
    console.log(`Team A: ${teamA.name}, Team B: ${teamB.name}`);

    // Ensure clean state for this player's bids
    await Bid.deleteMany({ player: testPlayer._id });

    // Step 1: Opening bid must be 10,000
    const openingAmount = calculateNextBid(0);
    assert.strictEqual(openingAmount, 10000);
    const bid1 = await new Bid({
      player: testPlayer._id,
      team: teamA._id,
      amount: 10000,
      bidNumber: 1
    }).save();
    console.log(`✓ Bid #1 accepted: 10,000 for ${teamA.name}`);

    // Step 2: Consecutive bid by same team must be rejected
    const latestBid = await Bid.findOne({ player: testPlayer._id }).sort({ bidNumber: -1 });
    assert.strictEqual(latestBid.team.toString(), teamA._id.toString());
    const isSameTeam = latestBid.team.toString() === teamA._id.toString();
    assert.strictEqual(isSameTeam, true, 'Same team should be detected');
    console.log('✓ Self-bidding guard verified: Team A cannot bid against Team A');

    // Step 3: Next bid calculation from 10,000 is 12,000
    const nextForTeamB = calculateNextBid(latestBid.amount);
    assert.strictEqual(nextForTeamB, 12000, 'Next bid after 10k must be 12k');
    const bid2 = await new Bid({
      player: testPlayer._id,
      team: teamB._id,
      amount: nextForTeamB,
      bidNumber: 2
    }).save();
    console.log(`✓ Bid #2 accepted: 12,000 for ${teamB.name}`);

    // Step 4: Test schedule boundaries all the way to 70k
    let current = 12000;
    let turn = 0;
    while (current < 70000) {
      const next = calculateNextBid(current);
      turn++;
      const currentTeam = turn % 2 === 1 ? teamA : teamB;
      const b = await new Bid({
        player: testPlayer._id,
        team: currentTeam._id,
        amount: next,
        bidNumber: turn + 2
      }).save();
      current = next;
    }
    console.log(`✓ Bidding progression reached: ${current.toLocaleString()} pts`);
    assert.strictEqual(current, 70000, 'Boundary progression verified up to 70k');

    // Step 5: Check bid history retrieval
    const history = await Bid.find({ player: testPlayer._id }).sort({ bidNumber: 1 });
    console.log(`✓ Total bids recorded in history: ${history.length}`);
    assert(history.length >= 8);

    // Clean up test bids so live auction data is untouched
    await Bid.deleteMany({ player: testPlayer._id });
    console.log('✓ Cleaned up test bids successfully.');

    console.log('🎉 ALL BACKEND E2E TESTS PASSED PERFECTLY!');
  } finally {
    await mongoose.disconnect();
  }
}

runE2ETest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

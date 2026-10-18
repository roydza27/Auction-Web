const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Player = require('../models/player.model');
const Team = require('../models/team.model');
const Bid = require('../models/bid.model');
const bidController = require('../controllers/bid.controller');
const playerController = require('../controllers/player.controller');

// Mock Express req/res helper
function createMockReqRes({ body = {}, params = {}, query = {} } = {}) {
  let statusCode = 200;
  let responseData = null;
  const mockIo = {
    emit: (_event, _payload) => {}
  };

  const req = {
    body,
    params,
    query,
    app: {
      get: (key) => (key === 'io' ? mockIo : null)
    }
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    send(data) {
      responseData = data;
      return this;
    }
  };

  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getData: () => responseData
  };
}

// Cleanup helper: Only deletes test records with __TEST_APL_ prefix
async function cleanupTestData() {
  const testTeams = await Team.find({ name: { $regex: '^__TEST_APL_' } });
  const testTeamIds = testTeams.map(t => t._id);

  const testPlayers = await Player.find({ regNo: { $regex: '^__TEST_APL_' } });
  const testPlayerIds = testPlayers.map(p => p._id);

  if (testPlayerIds.length > 0 || testTeamIds.length > 0) {
    await Bid.deleteMany({
      $or: [
        { player: { $in: testPlayerIds } },
        { team: { $in: testTeamIds } }
      ]
    });
  }

  if (testPlayerIds.length > 0) {
    await Player.deleteMany({ _id: { $in: testPlayerIds } });
  }

  if (testTeamIds.length > 0) {
    await Team.deleteMany({ _id: { $in: testTeamIds } });
  }
}

// =========================================================================
// SUITE 1: BIDDING INCREMENT SCHEDULE ENGINE (Pure Unit Tests - No DB Needed)
// =========================================================================
describe('Suite 1: Bidding Increment Schedule Engine', () => {
  const { calculateNextBid } = bidController;

  test('INC-01: Opening Regular Bid must start at base price 10,000 pts', () => {
    assert.strictEqual(calculateNextBid(0), 10000);
    assert.strictEqual(calculateNextBid(null), 10000);
    assert.strictEqual(calculateNextBid(undefined), 10000);
    assert.strictEqual(calculateNextBid(5000), 10000);
  });

  test('INC-02: Regular increments below 30,000 pts must increase by +2,000 pts', () => {
    assert.strictEqual(calculateNextBid(10000), 12000);
    assert.strictEqual(calculateNextBid(12000), 14000);
    assert.strictEqual(calculateNextBid(18000), 20000);
    assert.strictEqual(calculateNextBid(26000), 28000);
  });

  test('INC-03: Boundary 1 (28k -> 30k) must cross exactly at 30,000 pts (+2,000 pts)', () => {
    assert.strictEqual(calculateNextBid(28000), 30000);
  });

  test('INC-04: Regular increments from 30k to below 60,000 pts must increase by +5,000 pts', () => {
    assert.strictEqual(calculateNextBid(30000), 35000);
    assert.strictEqual(calculateNextBid(35000), 40000);
    assert.strictEqual(calculateNextBid(45000), 50000);
    assert.strictEqual(calculateNextBid(50000), 55000);
  });

  test('INC-05: Boundary 2 (55k -> 60k) must cross exactly at 60,000 pts (+5,000 pts)', () => {
    assert.strictEqual(calculateNextBid(55000), 60000);
  });

  test('INC-06: Regular increments 60,000 pts and above must increase by +10,000 pts', () => {
    assert.strictEqual(calculateNextBid(60000), 70000);
    assert.strictEqual(calculateNextBid(70000), 80000);
    assert.strictEqual(calculateNextBid(150000), 160000);
    assert.strictEqual(calculateNextBid(490000), 500000);
  });

  test('INC-07: Opening Unsold Bid must start at base price 2,000 pts', () => {
    assert.strictEqual(calculateNextBid(0, true), 2000);
    assert.strictEqual(calculateNextBid(null, true), 2000);
    assert.strictEqual(calculateNextBid(1000, true), 2000);
  });

  test('INC-08: Unsold increments below 10,000 pts must increase by +1,000 pts per bid', () => {
    assert.strictEqual(calculateNextBid(2000, true), 3000);
    assert.strictEqual(calculateNextBid(3000, true), 4000);
    assert.strictEqual(calculateNextBid(8000, true), 9000);
    assert.strictEqual(calculateNextBid(9000, true), 10000);
  });

  test('INC-09: Unsold transition to regular schedule once 10,000 pts is reached', () => {
    assert.strictEqual(calculateNextBid(10000, true), 12000);
  });
});

// =========================================================================
// SEQUENTIAL INTEGRATION SUITE (Single MongoDB connection, concurrency: 1)
// =========================================================================
describe('APL Auction Integration Scenarios Suite', { concurrency: 1 }, () => {
  let teamAlpha;
  let teamBeta;
  let teamBroke;
  let teamFull;
  let testPlayer;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 5 });
    }
    await cleanupTestData();

    // Create shared fixtures with __TEST_APL_ prefix
    teamAlpha = await new Team({
      name: '__TEST_APL_ALPHA__',
      totalSlots: 10,
      filledSlots: 0,
      budget: 500000,
      remainingBudget: 500000,
      players: []
    }).save();

    teamBeta = await new Team({
      name: '__TEST_APL_BETA__',
      totalSlots: 10,
      filledSlots: 0,
      budget: 500000,
      remainingBudget: 500000,
      players: []
    }).save();

    teamBroke = await new Team({
      name: '__TEST_APL_BROKE__',
      totalSlots: 10,
      filledSlots: 0,
      budget: 500000,
      remainingBudget: 5000,
      players: []
    }).save();

    teamFull = await new Team({
      name: '__TEST_APL_FULL__',
      totalSlots: 3,
      filledSlots: 3,
      budget: 500000,
      remainingBudget: 400000,
      players: []
    }).save();

    testPlayer = await new Player({
      name: '__TEST_APL_PLAYER_TEST__',
      regNo: '__TEST_APL_REG_TEST__',
      status: 'available',
      class: '4th Year CSE',
      position: 'All-Rounder'
    }).save();
  });

  after(async () => {
    await cleanupTestData();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // --- SUITE 2: Core Bidding Rules & Validation ---
  describe('Suite 2: Core Bidding Rules & Validation', () => {
    test('BID-01: First accepted bid places opening bid at base price 10,000 pts', async () => {
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString(), teamId: teamAlpha._id.toString() }
      });

      await bidController.placeBid(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 201);
      const data = mock.getData();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.currentBid, 10000);
      assert.strictEqual(data.nextBid, 12000);
      assert.strictEqual(data.highestBidder._id.toString(), teamAlpha._id.toString());
    });

    test('BID-02: Self-bidding guard rejects consecutive bid by the same leading franchise', async () => {
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString(), teamId: teamAlpha._id.toString() }
      });

      await bidController.placeBid(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 400);
      const data = mock.getData();
      assert.match(data.error, /already the leading bidder/i);
    });

    test('BID-03: Insufficient budget guard rejects bid when team remainingBudget < expectedAmount', async () => {
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString(), teamId: teamBroke._id.toString() }
      });

      await bidController.placeBid(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 400);
      const data = mock.getData();
      assert.match(data.error, /does not have enough remaining budget/i);
    });

    test('BID-04: Squad slot limit guard rejects bid when team filledSlots >= totalSlots', async () => {
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString(), teamId: teamFull._id.toString() }
      });

      await bidController.placeBid(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 400);
      const data = mock.getData();
      assert.match(data.error, /no available slots left/i);
    });

    test('BID-05: Amount schedule mismatch guard rejects invalid custom amount', async () => {
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString(), teamId: teamBeta._id.toString(), amount: 15000 }
      });

      await bidController.placeBid(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 400);
      const data = mock.getData();
      assert.match(data.error, /Invalid bid amount/i);
      assert.strictEqual(data.expectedAmount, 12000);
    });

    test('BID-06: Valid counter-bid by second team succeeds (+2,000 pts to 12,000 pts)', async () => {
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString(), teamId: teamBeta._id.toString() }
      });

      await bidController.placeBid(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 201);
      const data = mock.getData();
      assert.strictEqual(data.currentBid, 12000);
      assert.strictEqual(data.nextBid, 14000);
      assert.strictEqual(data.highestBidder._id.toString(), teamBeta._id.toString());
    });
  });

  // --- SUITE 3: Bid Undo / Rollback Engine ---
  describe('Suite 3: Bid Undo / Rollback Engine', () => {
    test('UND-01: Undo intermediate bid (reverts to previous bid amount and previous team)', async () => {
      // Currently testPlayer has Bid #1 (10k by Alpha) and Bid #2 (12k by Beta)
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString() }
      });

      await bidController.undoLastBid(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 200);
      const data = mock.getData();
      assert.strictEqual(data.currentBid, 10000);
      assert.strictEqual(data.nextBid, 12000);
      assert.strictEqual(data.highestBidder._id.toString(), teamAlpha._id.toString());
    });

    test('UND-02: Undo opening bid restores base price 10,000 pts and clears highest bidder', async () => {
      // Undo Bid #1 (Alpha's opening bid)
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString() }
      });

      await bidController.undoLastBid(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 200);
      const data = mock.getData();
      assert.strictEqual(data.currentBid, 0);
      assert.strictEqual(data.nextBid, 10000);
      assert.strictEqual(data.highestBidder, null);

      // Verify no bids remain
      const remainingBids = await Bid.find({ player: testPlayer._id });
      assert.strictEqual(remainingBids.length, 0);
    });

    test('UND-03: Undo on zero bids returns 400 error', async () => {
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString() }
      });

      await bidController.undoLastBid(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 400);
      const data = mock.getData();
      assert.match(data.error, /No bids exist to undo/i);
    });
  });

  // --- SUITE 4: Sale Finalization & Roster Sync ---
  describe('Suite 4: Sale Finalization & Roster Sync', () => {
    test('FIN-04: Finalize sale with no bids and no team returns 400', async () => {
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString() }
      });

      await bidController.finalizeSale(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 400);
      const data = mock.getData();
      assert.match(data.error, /No bids exist for this player/i);
    });

    test('FIN-01: Finalize sale updates player to sold, deducts budget, and updates slots', async () => {
      // Place a bid first
      await new Bid({
        player: testPlayer._id,
        team: teamAlpha._id,
        amount: 20000,
        bidNumber: 1
      }).save();

      const initialBudget = teamAlpha.remainingBudget;

      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString() }
      });

      await bidController.finalizeSale(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 200);

      // Verify Player
      const updatedPlayer = await Player.findById(testPlayer._id);
      assert.strictEqual(updatedPlayer.status, 'sold');
      assert.strictEqual(updatedPlayer.soldAmount, 20000);
      assert.strictEqual(updatedPlayer.team.toString(), teamAlpha._id.toString());

      // Verify Team
      const updatedTeam = await Team.findById(teamAlpha._id);
      assert.strictEqual(updatedTeam.remainingBudget, initialBudget - 20000);
      assert.strictEqual(updatedTeam.filledSlots, 1);
      assert.ok(updatedTeam.players.map(String).includes(testPlayer._id.toString()));
    });

    test('FIN-05: Finalize sale on already sold player returns 400 error', async () => {
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString() }
      });

      await bidController.finalizeSale(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 400);
      const data = mock.getData();
      assert.match(data.error, /already finalized as sold/i);
    });

    test('UND-04: Cannot undo bid on a player that is already finalized as sold', async () => {
      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString() }
      });

      await bidController.undoLastBid(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 400);
      const data = mock.getData();
      assert.match(data.error, /already finalized as sold/i);
    });
  });

  // --- SUITE 5: Unsold Marking, Clearance & Round Transitions ---
  describe('Suite 5: Unsold Marking, Clearance & Round Transitions', () => {
    let freshPlayer;

    before(async () => {
      freshPlayer = await new Player({
        name: '__TEST_APL_UNSOLD_FRESH__',
        regNo: '__TEST_APL_REG_UNS_FRESH__',
        status: 'available',
        class: '1st Year Mech',
        position: 'Wicket Keeper'
      }).save();
    });

    test('UNS-01: Mark active player unsold clears bids and sets status to unsold', async () => {
      await new Bid({
        player: freshPlayer._id,
        team: teamBeta._id,
        amount: 10000,
        bidNumber: 1
      }).save();

      const mock = createMockReqRes({
        body: { playerId: freshPlayer._id.toString() }
      });

      await bidController.markUnsold(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 200);

      const p = await Player.findById(freshPlayer._id);
      assert.strictEqual(p.status, 'unsold');
      assert.strictEqual(p.soldAmount, 0);
      assert.strictEqual(p.team, null);

      const bids = await Bid.find({ player: freshPlayer._id });
      assert.strictEqual(bids.length, 0);
    });

    test('UNS-03: Placing bid on unsold player blocked if Round 1 has available players', async () => {
      const availableCount = await Player.countDocuments({ status: 'available' });
      if (availableCount > 0) {
        const mock = createMockReqRes({
          body: { playerId: freshPlayer._id.toString(), teamId: teamBeta._id.toString() }
        });

        await bidController.placeBid(mock.req, mock.res);

        assert.strictEqual(mock.getStatusCode(), 400);
        const data = mock.getData();
        assert.match(data.error, /Unsold auction round can only be started after all current players have completed Round 1/i);
      } else {
        // If no available players, opening unsold bid starts at 2000
        const mock = createMockReqRes({
          body: { playerId: freshPlayer._id.toString(), teamId: teamBeta._id.toString() }
        });
        await bidController.placeBid(mock.req, mock.res);
        assert.strictEqual(mock.getStatusCode(), 201);
        assert.strictEqual(mock.getData().currentBid, 2000);
      }
    });

    test('UNS-02: Marking previously sold player as unsold refunds franchise and decrements slots', async () => {
      // testPlayer was finalized as sold to teamAlpha for 20,000 pts
      const currentTeam = await Team.findById(teamAlpha._id);
      const budgetBefore = currentTeam.remainingBudget;

      const mock = createMockReqRes({
        body: { playerId: testPlayer._id.toString() }
      });

      await bidController.markUnsold(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 200);

      const updatedPlayer = await Player.findById(testPlayer._id);
      assert.strictEqual(updatedPlayer.status, 'unsold');
      assert.strictEqual(updatedPlayer.team, null);

      const updatedTeam = await Team.findById(teamAlpha._id);
      assert.strictEqual(updatedTeam.remainingBudget, budgetBefore + 20000);
      assert.strictEqual(updatedTeam.filledSlots, 0);
      assert.ok(!updatedTeam.players.map(String).includes(testPlayer._id.toString()));
    });
  });

  // --- SUITE 6: Roster Removal & Transfers ---
  describe('Suite 6: Roster Removal & Transfers', () => {
    let assignedPlayer;

    before(async () => {
      assignedPlayer = await new Player({
        name: '__TEST_APL_ASSIGNED__',
        regNo: '__TEST_APL_REG_ASSIGNED__',
        status: 'sold',
        soldAmount: 30000,
        class: '3rd Year ME',
        position: 'Batsman',
        team: teamBeta._id
      }).save();

      teamBeta.players.push(assignedPlayer._id);
      teamBeta.filledSlots = 1;
      teamBeta.remainingBudget = 470000;
      await teamBeta.save();
    });

    test('ROST-01: removePlayerFromTeam restores player to available and refunds franchise', async () => {
      const mock = createMockReqRes({
        params: { playerId: assignedPlayer._id.toString() }
      });

      await playerController.removePlayerFromTeam(mock.req, mock.res);

      assert.strictEqual(mock.getStatusCode(), 200);

      const p = await Player.findById(assignedPlayer._id);
      assert.strictEqual(p.status, 'available');
      assert.strictEqual(p.team, null);
      assert.strictEqual(p.soldAmount, null);

      const team = await Team.findById(teamBeta._id);
      assert.strictEqual(team.remainingBudget, 500000);
      assert.strictEqual(team.filledSlots, 0);
    });
  });

  // --- SUITE 7: Full Tournament Match Simulation ---
  describe('Suite 7: Full Tournament Match Simulation', () => {
    let matchPlayer;

    before(async () => {
      matchPlayer = await new Player({
        name: '__TEST_APL_MATCH_STAR__',
        regNo: '__TEST_APL_REG_MATCH__',
        status: 'available',
        class: 'Tournament Finals',
        position: 'All-Rounder'
      }).save();
    });

    test('SIM-01: End-to-End tournament lifecycle: Bidding war, mistouch undo, hammer strike', async () => {
      // 1. Team Alpha opens with 10k
      let mock = createMockReqRes({
        body: { playerId: matchPlayer._id.toString(), teamId: teamAlpha._id.toString() }
      });
      await bidController.placeBid(mock.req, mock.res);
      assert.strictEqual(mock.getStatusCode(), 201);
      assert.strictEqual(mock.getData().currentBid, 10000);

      // 2. Team Beta raises to 12k
      mock = createMockReqRes({
        body: { playerId: matchPlayer._id.toString(), teamId: teamBeta._id.toString() }
      });
      await bidController.placeBid(mock.req, mock.res);
      assert.strictEqual(mock.getStatusCode(), 201);
      assert.strictEqual(mock.getData().currentBid, 12000);

      // 3. Team Alpha raises to 14k
      mock = createMockReqRes({
        body: { playerId: matchPlayer._id.toString(), teamId: teamAlpha._id.toString() }
      });
      await bidController.placeBid(mock.req, mock.res);
      assert.strictEqual(mock.getStatusCode(), 201);
      assert.strictEqual(mock.getData().currentBid, 14000);

      // 4. Mistouch: Team Beta bids 16k by accident
      mock = createMockReqRes({
        body: { playerId: matchPlayer._id.toString(), teamId: teamBeta._id.toString() }
      });
      await bidController.placeBid(mock.req, mock.res);
      assert.strictEqual(mock.getStatusCode(), 201);
      assert.strictEqual(mock.getData().currentBid, 16000);

      // 5. Auctioneer activates Undo -> Reverts to 14k for Team Alpha
      mock = createMockReqRes({
        body: { playerId: matchPlayer._id.toString() }
      });
      await bidController.undoLastBid(mock.req, mock.res);
      assert.strictEqual(mock.getStatusCode(), 200);
      assert.strictEqual(mock.getData().currentBid, 14000);
      assert.strictEqual(mock.getData().highestBidder._id.toString(), teamAlpha._id.toString());

      // 6. Going once, going twice, SOLD! Final Hammer Confirmation
      mock = createMockReqRes({
        body: { playerId: matchPlayer._id.toString() }
      });
      await bidController.finalizeSale(mock.req, mock.res);
      assert.strictEqual(mock.getStatusCode(), 200);

      // 7. Verification
      const finalizedPlayer = await Player.findById(matchPlayer._id);
      assert.strictEqual(finalizedPlayer.status, 'sold');
      assert.strictEqual(finalizedPlayer.soldAmount, 14000);
      assert.strictEqual(finalizedPlayer.team.toString(), teamAlpha._id.toString());

      const alphaTeam = await Team.findById(teamAlpha._id);
      assert.ok(alphaTeam.players.map(String).includes(matchPlayer._id.toString()));
    });
  });
});

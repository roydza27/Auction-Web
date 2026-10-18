const Bid = require('../models/bid.model');
const Player = require('../models/player.model');
const Team = require('../models/team.model');

/**
 * Calculates the next valid bid according to official APL Season 10 schedule:
 * - Base price: 10,000 points
 * - Below 30,000 points: +2,000 points
 * - 30,000 to below 60,000 points: +5,000 points
 * - 60,000 points and above: +10,000 points
 * Boundaries:
 * - 28,000 -> 30,000 -> 35,000 -> 40,000
 * - 55,000 -> 60,000 -> 70,000
 */
/**
 * Calculates the next valid bid according to official APL Season 10 schedule:
 * - Unsold Round (< 10,000): Base 2,000, +1,000 per bid
 * - Base price (Regular): 10,000 points
 * - Below 30,000 points: +2,000 points
 * - 30,000 to below 60,000 points: +5,000 points
 * - 60,000 points and above: +10,000 points
 * Boundaries:
 * - Unsold: 2,000 -> 3,000 -> ... -> 10,000
 * - 10,000 -> 12,000 -> ... -> 30,000 -> 35,000 -> 40,000
 * - 55,000 -> 60,000 -> 70,000
 */
const calculateNextBid = (currentBid, isUnsold = false) => {
  const bid = Number(currentBid) || 0;
  if (isUnsold && bid < 10000) {
    if (bid < 2000) return 2000;
    return bid + 1000;
  }
  if (bid < 10000) return 10000;
  if (bid < 30000) return bid + 2000;
  if (bid < 60000) return bid + 5000;
  return bid + 10000;
};

// Place an accepted bid on a player
exports.placeBid = async (req, res) => {
  try {
    const { playerId, teamId, amount } = req.body;

    if (!playerId || !teamId) {
      return res.status(400).json({ error: 'Player ID and Team ID are required' });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    if (player.status === 'sold') {
      return res.status(400).json({ error: 'Player is already sold' });
    }

    const isUnsold = player.status === 'unsold';

    // Core rule: Unsold players can only be auctioned after Round 1 (availableCount === 0)
    if (isUnsold) {
      const availableCount = await Player.countDocuments({ status: 'available' });
      if (availableCount > 0) {
        return res.status(400).json({
          error: `Unsold auction round can only be started after all current players have completed Round 1 (${availableCount} players remaining).`
        });
      }
    }

    const basePrice = isUnsold ? 2000 : 10000;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Franchise not found' });
    }

    // Check franchise slot limit
    if (team.filledSlots >= team.totalSlots) {
      return res.status(400).json({ error: `${team.name} has no available slots left (${team.filledSlots}/${team.totalSlots})` });
    }

    // Check latest bid on this player
    const latestBid = await Bid.findOne({ player: playerId }).sort({ bidNumber: -1 });

    let expectedAmount;
    let nextBidNumber = 1;

    if (!latestBid) {
      // Opening bid must be base price
      expectedAmount = basePrice;
    } else {
      // Cannot bid against self
      if (latestBid.team.toString() === teamId.toString()) {
        return res.status(400).json({ error: `${team.name} is already the leading bidder` });
      }
      expectedAmount = calculateNextBid(latestBid.amount, isUnsold);
      nextBidNumber = latestBid.bidNumber + 1;
    }

    // If an amount was provided, verify it strictly matches the calculated schedule
    if (amount !== undefined && Number(amount) !== expectedAmount) {
      return res.status(400).json({
        error: `Invalid bid amount. Expected ${expectedAmount.toLocaleString()} points according to official APL rules`,
        expectedAmount
      });
    }

    // Check franchise remaining budget
    const teamBudget = team.remainingBudget !== null && team.remainingBudget !== undefined
      ? team.remainingBudget
      : (team.budget || 500000);

    if (teamBudget < expectedAmount) {
      return res.status(400).json({
        error: `${team.name} does not have enough remaining budget (${teamBudget.toLocaleString()} points) for this bid (${expectedAmount.toLocaleString()} points)`
      });
    }

    // Save bid to history
    const newBid = new Bid({
      player: playerId,
      team: teamId,
      amount: expectedAmount,
      bidNumber: nextBidNumber,
      timestamp: new Date()
    });
    await newBid.save();

    await newBid.populate('team', 'name logoUrl remainingBudget budget');

    const nextUpcomingBid = calculateNextBid(expectedAmount, isUnsold);

    const bidData = {
      bid: newBid,
      playerId,
      currentBid: expectedAmount,
      nextBid: nextUpcomingBid,
      highestBidder: {
        _id: team._id,
        name: team.name,
        logoUrl: team.logoUrl,
        remainingBudget: team.remainingBudget
      }
    };

    // Emit Socket.io event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('bidPlaced', bidData);
    }

    return res.status(201).json({
      success: true,
      message: 'Bid accepted successfully',
      ...bidData
    });
  } catch (error) {
    console.error('Error placing bid:', error);
    return res.status(500).json({ error: 'Server error placing bid' });
  }
};

// Finalize sale of player to winning franchise
exports.finalizeSale = async (req, res) => {
  try {
    const { playerId, teamId, amount } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    if (player.status === 'sold') {
      return res.status(400).json({ error: 'Player is already finalized as sold' });
    }

    // Determine winning team and final amount
    let winningTeamId = teamId;
    let winningAmount = Number(amount);

    if (!winningTeamId || !winningAmount) {
      const latestBid = await Bid.findOne({ player: playerId }).sort({ bidNumber: -1 });
      if (!latestBid) {
        return res.status(400).json({ error: 'No bids exist for this player. Use Unsold action if passing.' });
      }
      winningTeamId = winningTeamId || latestBid.team;
      winningAmount = winningAmount || latestBid.amount;
    }

    const team = await Team.findById(winningTeamId);
    if (!team) {
      return res.status(404).json({ error: 'Winning franchise not found' });
    }

    // Check slot limit
    if (team.filledSlots >= team.totalSlots) {
      return res.status(400).json({ error: `${team.name} has no available slots` });
    }

    // Check budget
    const teamBudget = team.remainingBudget !== null && team.remainingBudget !== undefined
      ? team.remainingBudget
      : (team.budget || 500000);

    if (teamBudget < winningAmount) {
      return res.status(400).json({ error: `${team.name} has insufficient budget for final sale` });
    }

    // Update Player
    player.status = 'sold';
    player.team = team._id;
    player.soldAmount = winningAmount;
    await player.save();

    // Update Team
    if (!team.players.map(String).includes(String(player._id))) {
      team.players.push(player._id);
    }
    team.filledSlots = team.players.length;
    team.remainingBudget = teamBudget - winningAmount;
    await team.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('playerSold', { player, team, amount: winningAmount });
      io.emit('playerUpdated', player);
      io.emit('teamUpdated', team);
    }

    return res.json({
      success: true,
      message: `${player.name} sold to ${team.name} for ${winningAmount.toLocaleString()} points`,
      player,
      team
    });
  } catch (error) {
    console.error('Error finalizing sale:', error);
    return res.status(500).json({ error: 'Server error finalizing sale' });
  }
};

// Mark player as unsold
exports.markUnsold = async (req, res) => {
  try {
    const playerId = req.body.playerId || req.params.playerId;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // If player was previously assigned to a team, handle refund
    if (player.team) {
      const team = await Team.findById(player.team);
      if (team) {
        team.players = team.players.filter(p => String(p) !== String(player._id));
        team.filledSlots = team.players.length;
        team.remainingBudget = (team.remainingBudget || 0) + (player.soldAmount || 0);
        await team.save();

        const io = req.app.get('io');
        if (io) io.emit('teamUpdated', team);
      }
    }

    player.status = 'unsold';
    player.team = null;
    player.soldAmount = 0;
    await player.save();

    // Clear previous bids so any subsequent re-auction starts freshly from base price
    await Bid.deleteMany({ player: playerId });

    const io = req.app.get('io');
    if (io) {
      io.emit('playerMarkedUnsold', player);
      io.emit('playerUpdated', player);
    }

    return res.json({
      success: true,
      message: `${player.name} marked as unsold and retained for rapid-fire round`,
      player
    });
  } catch (error) {
    console.error('Error marking player unsold:', error);
    return res.status(500).json({ error: 'Server error marking player unsold' });
  }
};

// Get all bids for a player
exports.getPlayerBids = async (req, res) => {
  try {
    const { playerId } = req.params;
    const bids = await Bid.find({ player: playerId })
      .sort({ bidNumber: -1 })
      .populate('team', 'name logoUrl');

    const latestBid = bids[0] || null;
    const currentBid = latestBid ? latestBid.amount : 0;
    const nextBid = calculateNextBid(currentBid);

    return res.json({
      bids,
      currentBid,
      nextBid,
      highestBidder: latestBid ? latestBid.team : null
    });
  } catch (error) {
    console.error('Error fetching player bids:', error);
    return res.status(500).json({ error: 'Server error fetching player bids' });
  }
};

// Undo last accepted bid on a player (Rollback / Back action)
exports.undoLastBid = async (req, res) => {
  try {
    const playerId = req.body.playerId || req.params.playerId;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.status === 'sold') {
      return res.status(400).json({ error: 'Cannot undo bid on a player that is already finalized as sold' });
    }

    // Find the latest bid for this player
    const latestBid = await Bid.findOne({ player: playerId }).sort({ bidNumber: -1 }).populate('team', 'name logoUrl');

    if (!latestBid) {
      return res.status(400).json({ error: 'No bids exist to undo for this player' });
    }

    // Delete the latest bid
    await Bid.findByIdAndDelete(latestBid._id);

    // Find the previous bid (now the latest, if any)
    const previousBid = await Bid.findOne({ player: playerId })
      .sort({ bidNumber: -1 })
      .populate('team', 'name logoUrl remainingBudget budget');

    let currentBid = 0;
    let highestBidder = null;

    if (previousBid) {
      currentBid = previousBid.amount;
      highestBidder = {
        _id: previousBid.team._id,
        name: previousBid.team.name,
        logoUrl: previousBid.team.logoUrl,
        remainingBudget: previousBid.team.remainingBudget
      };
    }

    const nextBid = calculateNextBid(currentBid);

    const revertData = {
      playerId,
      undoneBid: latestBid,
      currentBid,
      nextBid,
      highestBidder
    };

    // Broadcast Socket.io event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('bidUndone', revertData);
    }

    return res.json({
      success: true,
      message: `Undone Bid #${latestBid.bidNumber} (${latestBid.amount.toLocaleString()} pts by ${latestBid.team?.name || 'Franchise'})`,
      ...revertData
    });
  } catch (error) {
    console.error('Error undoing bid:', error);
    return res.status(500).json({ error: 'Server error undoing bid' });
  }
};

exports.calculateNextBid = calculateNextBid;


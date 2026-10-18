const { calculateNextBid } = require('../controllers/bid.controller');
const assert = require('assert');

console.log('🧪 Testing APL Season 10 Bidding Increment Schedule...');

// 1. Initial / Opening Bid
assert.strictEqual(calculateNextBid(0), 10000, 'Opening bid from 0 must be 10,000 pts');
assert.strictEqual(calculateNextBid(null), 10000, 'Opening bid from null must be 10,000 pts');
assert.strictEqual(calculateNextBid(5000), 10000, 'Opening bid from < 10,000 must be 10,000 pts');

// 2. Below 30,000 points: increase by 2,000 points
assert.strictEqual(calculateNextBid(10000), 12000, '10,000 -> 12,000');
assert.strictEqual(calculateNextBid(12000), 14000, '12,000 -> 14,000');
assert.strictEqual(calculateNextBid(26000), 28000, '26,000 -> 28,000');
assert.strictEqual(calculateNextBid(28000), 30000, 'Boundary 1: 28,000 -> 30,000 (+2,000)');

// 3. 30,000 points to below 60,000 points: increase by 5,000 points
assert.strictEqual(calculateNextBid(30000), 35000, '30,000 -> 35,000 (+5,000)');
assert.strictEqual(calculateNextBid(35000), 40000, '35,000 -> 40,000 (+5,000)');
assert.strictEqual(calculateNextBid(50000), 55000, '50,000 -> 55,000 (+5,000)');
assert.strictEqual(calculateNextBid(55000), 60000, 'Boundary 2: 55,000 -> 60,000 (+5,000)');

// 4. 60,000 points and above: increase by 10,000 points
assert.strictEqual(calculateNextBid(60000), 70000, '60,000 -> 70,000 (+10,000)');
assert.strictEqual(calculateNextBid(70000), 80000, '70,000 -> 80,000 (+10,000)');
assert.strictEqual(calculateNextBid(100000), 110000, '100,000 -> 110,000 (+10,000)');
assert.strictEqual(calculateNextBid(490000), 500000, '490,000 -> 500,000 (+10,000)');

console.log('✅ ALL INCREMENT AND BOUNDARY TESTS PASSED SUCCESSFULLY!');

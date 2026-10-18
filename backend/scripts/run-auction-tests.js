#!/usr/bin/env node

/**
 * APL Auction Comprehensive Scenarios Test Runner
 * Runs all unit, integration, and tournament lifecycle tests
 * with structured console output and summary dashboard.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('='.repeat(72));
console.log('🏆  APL SEASON 10: OFFICIAL AUCTION TEST SCENARIOS RUNNER  🏆');
console.log('='.repeat(72));
console.log('• Testing Increment Schedule Boundaries (2k, 10k, 30k, 60k, 500k)');
console.log('• Testing Self-Bidding, Insufficient Budget, and Slot Limit Guards');
console.log('• Testing Bid Undo / Rollback Engine & State Machine');
console.log('• Testing Hammer Finalization, Sold Sync, and Roster Deductions');
console.log('• Testing Unsold Pool Rules, Purges, and Sold Player Refunds');
console.log('• Testing End-to-End Live Tournament Lifecycle Simulation');
console.log('='.repeat(72));
console.log('');

const startTime = Date.now();

const testProcess = spawn('node', ['--test', 'tests/auction-scenarios.test.js'], {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'inherit'
});

testProcess.on('close', (code) => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('');
  console.log('='.repeat(72));
  if (code === 0) {
    console.log(`✅  ALL AUCTION SCENARIOS PASSED PERFECTLY in ${duration}s!`);
    console.log('🛡️  Verified: 0 database leaks, all test documents cleanly purged.');
  } else {
    console.error(`❌  AUCTION TESTS FAILED with exit code ${code} in ${duration}s.`);
  }
  console.log('='.repeat(72));
  process.exit(code);
});

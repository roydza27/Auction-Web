/**
 * Official APL Season 10 Bidding Increment Schedule:
 * - Unsold Round (< 10,000): Base 2,000, increase by 1,000 points per bid
 * - Base price (Regular): 10,000 points
 * - Below 30,000 points: increase by 2,000 points per bid
 * - 30,000 to below 60,000 points: increase by 5,000 points per bid
 * - 60,000 points and above: increase by 10,000 points per bid
 * Boundaries:
 * - Unsold: 2,000 -> 3,000 -> ... -> 10,000
 * - 10,000 -> 12,000 -> ... -> 30,000 -> 35,000 -> 40,000
 * - 55,000 -> 60,000 -> 70,000
 */
export const calculateNextBid = (currentBid: number, isUnsold: boolean = false): number => {
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

export const getBidIncrement = (currentBid: number, isUnsold: boolean = false): number => {
  const bid = Number(currentBid) || 0;
  if (isUnsold && bid < 10000) {
    return 1000;
  }
  if (bid < 10000) return 10000;
  if (bid < 30000) return 2000;
  if (bid < 60000) return 5000;
  return 10000;
};

export const calculatePreviousBid = (currentBid: number, isUnsold: boolean = false): number => {
  const basePrice = isUnsold ? 2000 : 10000;
  const bid = Number(currentBid) || basePrice;
  if (bid <= basePrice) return basePrice;
  if (isUnsold && bid <= 10000) {
    return Math.max(2000, bid - 1000);
  }
  if (bid <= 30000) return Math.max(10000, bid - 2000);
  if (bid <= 60000) return Math.max(30000, bid - 5000);
  return Math.max(60000, bid - 10000);
};

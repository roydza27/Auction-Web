export interface Player {
  _id: string;
  name: string;
  regNo: string;
  class: string;
  position: string;
  photoUrl: string;
  email?: string;
  status: 'available' | 'sold' | 'unsold';
  team: string | { _id: string; name: string; remainingBudget?: number; logoUrl?: string } | null;
  soldAmount: number;
  createdAt: string;
}

export interface Team {
  _id: string;
  name: string;
  totalSlots: number;
  filledSlots: number;
  budget: number | null;
  totalBudget?: number;
  remainingBudget: number;
  logoUrl?: string;
  players: Player[];
  createdAt: string;
}

export interface Bid {
  _id: string;
  player: string;
  team: {
    _id: string;
    name: string;
    logoUrl?: string;
    remainingBudget?: number;
    budget?: number;
  };
  amount: number;
  bidNumber: number;
  timestamp: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
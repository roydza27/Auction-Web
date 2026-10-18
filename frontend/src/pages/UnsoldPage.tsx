import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Player, Team } from '../types';
import confetti from 'canvas-confetti';
import { getImageUrl } from '../utils/imageUtils';

const UnsoldPage: React.FC = () => {
  const navigate = useNavigate();
  const [unsoldPlayers, setUnsoldPlayers] = useState<Player[]>([]);
  const [availableCount, setAvailableCount] = useState<number>(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [soldAmount, setSoldAmount] = useState<number>(0);
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const fetchUnsoldPlayers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/players`);
      const unsold = response.data.filter((p: Player) => p.status === 'unsold');
      const available = response.data.filter((p: Player) => p.status === 'available');
      setUnsoldPlayers(unsold);
      setAvailableCount(available.length);
    } catch (error) {
      console.error('Error fetching unsold players:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API_URL}/teams`);
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  useEffect(() => {
    fetchUnsoldPlayers();
    fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuctionClick = (player: Player) => {
    setSelectedPlayer(player);
    setSoldAmount(0);
    setSelectedTeam('');
    setShowModal(true);
  };

  const handleAuctionConfirm = async () => {
    if (!selectedPlayer || !selectedTeam || !soldAmount) {
      return;
    }

    try {
      // Update player with sold status, team, and amount
      await axios.patch(`${API_URL}/players/${selectedPlayer._id}`, {
        status: 'sold',
        team: selectedTeam,
        soldAmount: soldAmount
      });

      // Add player to team and deduct amount
      await axios.patch(`${API_URL}/teams/${selectedTeam}`, {
        $push: { players: selectedPlayer._id },
        soldAmount: soldAmount
      });

      // Play confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Reset and refresh
      setShowModal(false);
      setSelectedPlayer(null);
      setSoldAmount(0);
      setSelectedTeam('');
      fetchUnsoldPlayers();
      fetchTeams();
    } catch (error) {
      console.error('Error auctioning player:', error);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Compact Header Section */}
      <div className="flex-shrink-0 theme-header px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #fca5a5 50%, #dc2626 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 40px rgba(220, 38, 38, 0.3)'
            }}>Unsold Players</h1>
            <p className="text-gray-400 text-sm font-medium tracking-wide">Players available for Round 2 re-auction</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="theme-stat-box px-4 py-2 border-red-500/30">
              <p className="text-xs text-gray-400">Total Unsold</p>
              <p className="text-xl font-black text-red-400">{unsoldPlayers.length}</p>
            </div>
            {availableCount > 0 ? (
              <div className="theme-stat-box px-4 py-2 border-amber-500/30 bg-amber-950/20">
                <p className="text-xs text-amber-400/80">Round 1 Remaining</p>
                <p className="text-xl font-black text-amber-400">{availableCount}</p>
              </div>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <span>⚡</span>
                <span>Start Unsold Round on Stage →</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Round 1 Status Lock Notification Bar */}
      {availableCount > 0 ? (
        <div className="bg-amber-950/60 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
            <span className="text-sm">🔒</span>
            <span>
              <strong>Round 1 in Progress:</strong> {availableCount} available players remaining. The Unsold Round will unlock on the Live Stage once all current players are auctioned.
            </span>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
            Locked
          </span>
        </div>
      ) : unsoldPlayers.length > 0 ? (
        <div className="bg-gradient-to-r from-emerald-950/70 via-amber-950/70 to-emerald-950/70 border-b border-amber-500/40 px-6 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
            <span className="text-sm">✨</span>
            <span>
              <strong>Round 1 Complete!</strong> Unsold Players live re-auction is now UNLOCKED on the Home Stage (Base price: ₹2,000 pts).
            </span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-xs font-bold text-amber-300 hover:text-white underline decoration-amber-400 underline-offset-4 flex items-center gap-1"
          >
            Go to Stage →
          </button>
        </div>
      ) : null}

      {/* Players Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4" style={{
                borderColor: 'transparent',
                borderTopColor: '#dc2626'
              }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🚫</span>
              </div>
            </div>
            <p className="mt-4 text-gray-400 font-medium">Loading unsold players...</p>
          </div>
        </div>
      ) : unsoldPlayers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
              <span className="text-5xl">🎉</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">All Players Sold!</h3>
            <p className="text-gray-400">Great job! No unsold players remaining.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {unsoldPlayers.map((player) => (
              <div
                key={player._id}
                className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 shadow-lg border border-gray-700/50 hover:border-red-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10 hover:scale-[1.02]"
              >
                {/* Unsold Badge - Top Right */}
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold bg-red-500/20 border-red-500/30 text-red-400 border flex items-center gap-1">
                  <span>🚫</span>
                  <span className="uppercase">Unsold</span>
                </div>

                {/* Player Photo */}
                <div className="flex justify-center mb-3">
                  {player.photoUrl && player.photoUrl.trim() !== '' ? (
                    <img 
                      src={getImageUrl(player.photoUrl)} 
                      alt={player.name}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-full object-cover border-4 border-gray-700 group-hover:border-red-500 transition-all duration-300 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = `<div class="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-3xl font-black text-white border-4 border-gray-700 group-hover:border-red-500 transition-all duration-300 group-hover:scale-110">${player.name.charAt(0)}</div>`;
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-3xl font-black text-white border-4 border-gray-700 group-hover:border-red-500 transition-all duration-300 group-hover:scale-110">
                      {player.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="text-center mb-3">
                  <h3 className="text-lg font-black text-white truncate group-hover:text-red-400 transition-colors">
                    {player.name}
                  </h3>
                </div>

                {/* Player Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700/30">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Class
                    </span>
                    <span className="text-xs font-bold text-white truncate ml-2">{player.class}</span>
                  </div>
                  
                  <div className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700/30">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Position
                    </span>
                    <span className="text-xs font-bold text-white truncate ml-2">{player.position}</span>
                  </div>

                  {/* Auction Stage Action */}
                  {availableCount > 0 ? (
                    <button
                      disabled
                      className="w-full mt-2 px-3 py-2 bg-gray-800/80 text-gray-500 border border-gray-700/50 rounded-lg text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5 opacity-60"
                      title={`Round 1 in progress. ${availableCount} available players remaining.`}
                    >
                      <span>🔒</span>
                      <span>Locked ({availableCount} R1 Left)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/?playerId=${player._id}`)}
                      className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black rounded-lg text-sm font-extrabold transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                      title="Auction this player live on the main stage"
                    >
                      <span>⚡</span>
                      <span>Auction on Stage</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auction Modal */}
      {showModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-b border-gray-700 px-6 py-4 rounded-t-2xl">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <span>🔨</span>
                Auction Player
              </h2>
              <p className="text-sm text-gray-400 mt-1">Enter details to auction {selectedPlayer.name}</p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Player Info */}
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-4">
                  {selectedPlayer.photoUrl && selectedPlayer.photoUrl.trim() !== '' ? (
                    <img 
                      src={getImageUrl(selectedPlayer.photoUrl)} 
                      alt={selectedPlayer.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = `<div class="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-2xl font-black text-white">${selectedPlayer.name.charAt(0)}</div>`;
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-2xl font-black text-white">
                      {selectedPlayer.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedPlayer.name}</h3>
                    <p className="text-xs text-gray-400">{selectedPlayer.class}</p>
                    <p className="text-xs text-emerald-400 font-bold">{selectedPlayer.position}</p>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Sold Amount (₹)
                </label>
                <input
                  type="number"
                  value={soldAmount || ''}
                  onChange={(e) => setSoldAmount(Number(e.target.value))}
                  placeholder="Enter amount..."
                  className="w-full px-4 py-3 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white font-bold text-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  autoFocus
                />
              </div>

              {/* Team Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Select Team
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {teams.map((team) => (
                    <button
                      key={team._id}
                      onClick={() => setSelectedTeam(team._id)}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all text-left ${
                        selectedTeam === team._id
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:border-emerald-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">{team.name}</p>
                          <p className="text-xs opacity-80">
                            Budget: ₹{team.remainingBudget?.toLocaleString() || 0} • Players: {team.players.length}/{team.totalSlots || 15}
                          </p>
                        </div>
                        {selectedTeam === team._id && (
                          <span className="text-xl">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-900/50 rounded-b-2xl border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedPlayer(null);
                  setSoldAmount(0);
                  setSelectedTeam('');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAuctionConfirm}
                disabled={!soldAmount || !selectedTeam}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>✓</span>
                Confirm Auction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 0.3s ease;
        }
        .custom-scrollbar:hover {
          scrollbar-color: rgba(239, 68, 68, 0.45) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 9999px;
          transition: background-color 0.3s ease;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(239, 68, 68, 0.4);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(239, 68, 68, 0.85);
        }
      `}</style>
    </div>
  );
};

export default UnsoldPage;

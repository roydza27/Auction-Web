import React, { useState, useEffect } from 'react';
import { Player, Team } from '../types';
import { playerService, teamService } from '../services/api';
import CSVUpload from '../components/players/CSVUpload';
import { getImageUrl } from '../utils/imageUtils';

interface PlayerFormData {
  name: string;
  regNo: string;
  class: string;
  position: string;
  email: string;
  photoUrl: string;
  status: 'available' | 'sold' | 'unsold';
  team: string;
  soldAmount: number;
}

const initialFormData: PlayerFormData = {
  name: '',
  regNo: '',
  class: '',
  position: 'Batsman',
  email: '',
  photoUrl: '',
  status: 'available',
  team: '',
  soldAmount: 0,
};

const POSITIONS = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];

const getPositionBadgeStyle = (position: string) => {
  const pos = (position || '').toLowerCase();
  if (pos.includes('bat')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  if (pos.includes('bowl')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  if (pos.includes('all')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (pos.includes('keeper') || pos.includes('wk')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
};

const PlayersPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'sold' | 'unsold'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<string>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<PlayerFormData>(initialFormData);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const data = await playerService.getAllPlayers();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
      showToast('Failed to fetch players list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const data = await teamService.getAllTeams();
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  useEffect(() => {
    fetchPlayers();
    fetchTeams();
  }, []);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData(initialFormData);
    setPhotoFile(null);
    setPhotoPreview('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (player: Player) => {
    setEditingPlayer(player);
    const teamId = typeof player.team === 'object' && player.team ? player.team._id : (player.team || '');
    setFormData({
      name: player.name || '',
      regNo: player.regNo || '',
      class: player.class || '',
      position: player.position || 'Batsman',
      email: player.email || '',
      photoUrl: player.photoUrl || '',
      status: player.status || 'available',
      team: teamId,
      soldAmount: player.soldAmount || 0,
    });
    setPhotoFile(null);
    setPhotoPreview(player.photoUrl ? getImageUrl(player.photoUrl) : '');
    setFormError(null);
  };

  // Handle File Input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    }
  };

  // Submit Add Player
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.class.trim() || !formData.position.trim()) {
      setFormError('Name, Class, and Position are required fields.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const submissionData = new FormData();
      submissionData.append('name', formData.name.trim());
      if (formData.regNo.trim()) submissionData.append('regNo', formData.regNo.trim());
      submissionData.append('class', formData.class.trim());
      submissionData.append('position', formData.position.trim());
      if (formData.email.trim()) submissionData.append('email', formData.email.trim());
      if (photoFile) {
        submissionData.append('photo', photoFile);
      } else if (formData.photoUrl.trim()) {
        submissionData.append('photoUrl', formData.photoUrl.trim());
      }

      await playerService.createPlayer(submissionData);
      showToast(`Player "${formData.name}" created successfully!`);
      setIsAddModalOpen(false);
      fetchPlayers();
      fetchTeams();
    } catch (err: any) {
      console.error('Error creating player:', err);
      setFormError(err.response?.data?.error || err.message || 'Failed to create player');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Player
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    if (!formData.name.trim() || !formData.class.trim() || !formData.position.trim()) {
      setFormError('Name, Class, and Position are required fields.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const submissionData = new FormData();
      submissionData.append('name', formData.name.trim());
      submissionData.append('regNo', formData.regNo.trim());
      submissionData.append('class', formData.class.trim());
      submissionData.append('position', formData.position.trim());
      submissionData.append('email', formData.email.trim());
      submissionData.append('status', formData.status);
      submissionData.append('team', formData.team || '');
      submissionData.append('soldAmount', String(formData.soldAmount || 0));

      if (photoFile) {
        submissionData.append('photo', photoFile);
      } else if (formData.photoUrl.trim()) {
        submissionData.append('photoUrl', formData.photoUrl.trim());
      }

      await playerService.updatePlayer(editingPlayer._id, submissionData);
      showToast(`Player "${formData.name}" updated successfully!`);
      setEditingPlayer(null);
      fetchPlayers();
      fetchTeams();
    } catch (err: any) {
      console.error('Error updating player:', err);
      setFormError(err.response?.data?.error || err.message || 'Failed to update player');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete Player
  const handleDeleteConfirm = async () => {
    if (!deletingPlayer) return;

    try {
      setSubmitting(true);
      await playerService.deletePlayer(deletingPlayer._id);
      showToast(`Player "${deletingPlayer.name}" deleted successfully!`);
      setDeletingPlayer(null);
      fetchPlayers();
      fetchTeams();
    } catch (err: any) {
      console.error('Error deleting player:', err);
      showToast(err.response?.data?.error || 'Failed to delete player', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Reset All Players
  const handleResetConfirm = async () => {
    try {
      setSubmitting(true);
      const res = await playerService.deleteAllPlayers();
      showToast(res.message || 'All players have been reset!');
      setIsResetModalOpen(false);
      fetchPlayers();
      fetchTeams();
    } catch (err: any) {
      console.error('Error resetting players:', err);
      showToast(err.response?.data?.error || 'Failed to reset players', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering Logic
  const filteredPlayers = players.filter((player) => {
    // Status filter
    if (filter !== 'all' && player.status !== filter) return false;

    // Position filter
    if (selectedPositionFilter !== 'all' && player.position.toLowerCase() !== selectedPositionFilter.toLowerCase()) {
      return false;
    }

    // Search query
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchName = player.name?.toLowerCase().includes(q);
      const matchReg = player.regNo?.toLowerCase().includes(q);
      const matchClass = player.class?.toLowerCase().includes(q);
      const matchPos = player.position?.toLowerCase().includes(q);
      const matchEmail = player.email?.toLowerCase().includes(q);
      const teamName = typeof player.team === 'object' && player.team ? player.team.name?.toLowerCase() : '';
      const matchTeam = teamName.includes(q);

      return matchName || matchReg || matchClass || matchPos || matchEmail || matchTeam;
    }

    return true;
  });

  const statusConfig = {
    available: { 
      bg: 'bg-green-500/20', 
      border: 'border-green-500/30', 
      text: 'text-green-400',
      icon: '✓'
    },
    sold: { 
      bg: 'bg-blue-500/20', 
      border: 'border-blue-500/30', 
      text: 'text-blue-400',
      icon: '💰'
    },
    unsold: { 
      bg: 'bg-red-500/20', 
      border: 'border-red-500/30', 
      text: 'text-red-400',
      icon: '✗'
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0d1117] text-gray-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border transition-all animate-bounce ${
          toastMessage.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-emerald-900/30'
            : 'bg-red-950/90 text-red-300 border-red-500/50 shadow-red-900/30'
        }`}>
          <span>{toastMessage.type === 'success' ? '✓' : '⚠'}</span>
          <span className="font-semibold text-sm">{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-gray-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Section */}
      <div 
        className="relative flex-shrink-0 border-b px-6 py-4 overflow-hidden" 
        style={{
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(17, 24, 39, 0.95) 50%, rgba(0, 0, 0, 0.95) 100%)',
          borderBottom: '2px solid rgba(212, 175, 55, 0.3)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.8), 0 0 40px rgba(212, 175, 55, 0.1)'
        }}
      >
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          {/* Title & CSV Upload */}
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F0D770 50%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Players Management
              </h1>
              <p className="text-gray-400 text-xs font-medium tracking-wide">
                Manage, add, update, and search auction players
              </p>
            </div>
            
            {/* CSV Upload */}
            <div className="w-72">
              <CSVUpload onUploadSuccess={() => { fetchPlayers(); fetchTeams(); }} />
            </div>
          </div>

          {/* Action Buttons & Stats */}
          <div className="flex items-center gap-3">
            {/* Add Player Button */}
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-black transition-all duration-300 hover:scale-105 shadow-lg active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #F0D770 50%, #D4AF37 100%)',
                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)'
              }}
            >
              <span className="text-base font-extrabold">+</span>
              <span>Add Player</span>
            </button>

            {/* Reset All Button */}
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-xs text-red-400 bg-red-950/40 border border-red-500/30 hover:bg-red-900/60 hover:text-red-300 transition-all active:scale-95"
              title="Reset all players in database"
            >
              <span>🗑️</span>
              <span>Reset All</span>
            </button>

            {/* Stats Card */}
            <div className="backdrop-blur-sm rounded-xl px-4 py-2 text-right border border-yellow-500/20 bg-black/60 shadow-inner">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total</p>
              <p className="text-xl font-black text-amber-400">{players.length}</p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar Row */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-gray-800/80">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'available', 'sold', 'unsold'] as const).map((f) => {
              const count = f === 'all' ? players.length : players.filter(p => p.status === f).length;
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-lg font-bold text-xs capitalize transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'text-black shadow-md'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 bg-gray-900/40 border border-gray-800'
                  }`}
                  style={isActive ? {
                    background: 'linear-gradient(135deg, #D4AF37 0%, #F0D770 50%, #D4AF37 100%)',
                  } : undefined}
                >
                  <span>{f}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Position Dropdown Filter */}
            <select
              value={selectedPositionFilter}
              onChange={(e) => setSelectedPositionFilter(e.target.value)}
              className="ml-2 bg-gray-900/90 border border-gray-700/80 text-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Positions</option>
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search name, regNo, position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-gray-900/80 border border-gray-700/70 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Players Grid Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div 
                className="inline-block animate-spin rounded-full h-14 w-14 border-4" 
                style={{
                  borderColor: 'transparent',
                  borderTopColor: '#D4AF37'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl">🏏</span>
              </div>
            </div>
            <p className="mt-3 text-gray-400 font-medium text-sm">Loading players data...</p>
          </div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md bg-gray-900/50 p-8 rounded-2xl border border-gray-800">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/30 text-3xl">
              🏏
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {searchTerm ? 'No Matching Players' : (filter === 'all' ? 'No Players Found' : `No ${filter} Players`)}
            </h3>
            <p className="text-gray-400 text-sm mb-5">
              {searchTerm
                ? `No players matched "${searchTerm}". Try a different search.`
                : 'Upload a CSV file or click "+ Add Player" to get started.'}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-amber-400 text-xs font-bold rounded-lg transition-all"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-bold rounded-lg shadow-lg hover:scale-105 transition-all"
              >
                + Add Your First Player
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPlayers.map((player) => {
              const statusCfg = statusConfig[player.status as keyof typeof statusConfig] || statusConfig.available;
              const posStyle = getPositionBadgeStyle(player.position);
              const teamObj = typeof player.team === 'object' && player.team ? player.team : null;

              return (
                <div
                  key={player._id}
                  className="group relative bg-gradient-to-br from-gray-900/90 to-gray-800/80 rounded-2xl p-4 shadow-xl border border-gray-800 hover:border-amber-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 flex flex-col justify-between"
                >
                  {/* Top Header inside Card: Action buttons & Status badge */}
                  <div className="flex items-center justify-between mb-3">
                    {/* Action Buttons: Edit & Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(player)}
                        title="Edit Player"
                        className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-amber-500/20 text-gray-400 hover:text-amber-300 border border-gray-700/60 hover:border-amber-500/40 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingPlayer(player)}
                        title="Delete Player"
                        className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-gray-700/60 hover:border-red-500/40 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text} border flex items-center gap-1`}>
                      <span>{statusCfg.icon}</span>
                      <span>{player.status}</span>
                    </div>
                  </div>

                  {/* Player Photo */}
                  <div className="flex justify-center mb-3">
                    {player.photoUrl && player.photoUrl.trim() !== '' ? (
                      <img 
                        src={getImageUrl(player.photoUrl)} 
                        alt={player.name}
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-full object-cover border-2 border-amber-500/30 group-hover:border-amber-400 transition-all duration-300 shadow-md group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerHTML = `<div class="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center text-2xl font-black text-black border-2 border-amber-400">${player.name.charAt(0)}</div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center text-2xl font-black text-black border-2 border-amber-400">
                        {player.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Player Name & Reg No */}
                  <div className="text-center mb-3">
                    <h3 className="text-base font-extrabold text-white truncate group-hover:text-amber-300 transition-colors">
                      {player.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-mono tracking-wider">{player.regNo}</p>
                    {player.email && (
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{player.email}</p>
                    )}
                  </div>

                  {/* Details Badges */}
                  <div className="space-y-2 mt-auto">
                    <div className="flex items-center justify-between bg-black/40 rounded-xl px-3 py-1.5 border border-gray-800">
                      <span className="text-[11px] text-gray-400 font-medium">Position</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${posStyle}`}>
                        {player.position}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-black/40 rounded-xl px-3 py-1.5 border border-gray-800">
                      <span className="text-[11px] text-gray-400 font-medium">Class</span>
                      <span className="text-[11px] font-bold text-gray-200 truncate ml-2">
                        {player.class}
                      </span>
                    </div>

                    {player.status === 'sold' && (
                      <div className="bg-gradient-to-r from-emerald-950/40 to-teal-950/40 rounded-xl px-3 py-2 border border-emerald-500/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Sold For</span>
                          <span className="text-xs font-black text-emerald-300">₹{(player.soldAmount || 0).toLocaleString()}</span>
                        </div>
                        {teamObj && (
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-500/20">
                            <span className="text-[10px] text-gray-400 font-medium">Team</span>
                            <span className="text-xs font-bold text-amber-300 truncate">{teamObj.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD PLAYER MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-gray-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 text-gray-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
                <span>➕</span> Add New Player
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-950/60 border border-red-500/40 text-red-300 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2 bg-black/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Registration No
                  </label>
                  <input
                    type="text"
                    value={formData.regNo}
                    onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3.5 py-2 bg-black/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Leaves blank for APL-XXX format</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Class / Course <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    placeholder="e.g. MCA 2nd Year"
                    className="w-full px-3.5 py-2 bg-black/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Position <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3.5 py-2 bg-black/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {POSITIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="player@example.com"
                    className="w-full px-3.5 py-2 bg-black/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Photo Input (Upload or URL) */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Player Photo
                </label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-md" 
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500 text-xs">
                      No Photo
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-800 file:text-amber-400 hover:file:bg-gray-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Or enter image URL..."
                      value={formData.photoUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, photoUrl: e.target.value });
                        if (!photoFile) setPhotoPreview(e.target.value);
                      }}
                      className="w-full px-3 py-1.5 bg-black/60 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Creating...' : 'Create Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT PLAYER MODAL */}
      {/* ========================================================================= */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-gray-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 text-gray-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
                <span>✏️</span> Edit Player: {editingPlayer.name}
              </h2>
              <button
                onClick={() => setEditingPlayer(null)}
                className="text-gray-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-950/60 border border-red-500/40 text-red-300 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-black/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Registration No <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.regNo}
                    onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                    className="w-full px-3.5 py-2 bg-black/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Class / Course <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-3.5 py-2 bg-black/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Position <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3.5 py-2 bg-black/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {POSITIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-black/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Status & Team Transfer Sync */}
              <div className="p-3 bg-black/40 rounded-xl border border-gray-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as 'available' | 'sold' | 'unsold';
                        setFormData({
                          ...formData,
                          status: newStatus,
                          team: newStatus === 'sold' ? formData.team : '',
                          soldAmount: newStatus === 'sold' ? formData.soldAmount : 0,
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                      <option value="unsold">Unsold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Assigned Team
                    </label>
                    <select
                      disabled={formData.status !== 'sold'}
                      value={formData.team}
                      onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-40"
                    >
                      <option value="">-- No Team --</option>
                      {teams.map(t => (
                        <option key={t._id} value={t._id}>
                          {t.name} (Budget: ₹{t.remainingBudget?.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Sold Amount (₹)
                    </label>
                    <input
                      type="number"
                      disabled={formData.status !== 'sold'}
                      value={formData.soldAmount || 0}
                      onChange={(e) => setFormData({ ...formData, soldAmount: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-40 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Upload / Update */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Change Photo
                </label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-md" 
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500 text-xs">
                      No Photo
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-800 file:text-amber-400 hover:file:bg-gray-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Or enter photo URL..."
                      value={formData.photoUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, photoUrl: e.target.value });
                        if (!photoFile) setPhotoPreview(getImageUrl(e.target.value));
                      }}
                      className="w-full px-3 py-1.5 bg-black/60 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deletingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-gray-900 border border-red-500/50 rounded-2xl shadow-2xl p-6 text-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-400 pb-3 border-b border-gray-800">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-lg font-black">Delete Player</h2>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-sm text-gray-300">
                Are you sure you want to permanently delete <strong className="text-white">{deletingPlayer.name}</strong> ({deletingPlayer.regNo})?
              </p>
              
              {deletingPlayer.status === 'sold' && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-300">
                  ℹ️ This player is currently sold. Deleting them will automatically refund <strong>₹{deletingPlayer.soldAmount?.toLocaleString()}</strong> back to their team's budget and free up 1 slot.
                </div>
              )}

              <p className="text-xs text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setDeletingPlayer(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? 'Deleting...' : 'Yes, Delete Player'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET ALL PLAYERS MODAL */}
      {/* ========================================================================= */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-gray-900 border border-red-600 rounded-2xl shadow-2xl p-6 text-gray-100">
            <div className="flex items-center gap-3 text-red-500 pb-3 border-b border-gray-800">
              <span className="text-2xl">🚨</span>
              <h2 className="text-lg font-black">Reset All Players</h2>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-sm text-gray-300">
                Are you sure you want to delete <strong className="text-red-400">ALL {players.length} PLAYERS</strong>?
              </p>
              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 space-y-1">
                <p>• All players will be permanently removed from MongoDB.</p>
                <p>• All teams' roster slots and budgets will be reset to initial state.</p>
                <p>• This action is completely irreversible.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleResetConfirm}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? 'Resetting...' : 'Yes, Reset Everything'}
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
          scrollbar-color: rgba(212, 175, 55, 0.45) transparent;
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
          background: rgba(212, 175, 55, 0.4);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.85);
        }
      `}</style>
    </div>
  );
};

export default PlayersPage;

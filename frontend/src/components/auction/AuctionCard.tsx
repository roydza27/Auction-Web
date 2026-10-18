import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bid, Player, Team } from "../../types";
import { calculateNextBid, calculatePreviousBid, getBidIncrement } from "../../utils/biddingUtils";
import { getImageUrl } from "../../utils/imageUtils";
import "./AuctionCard.css";
import TeamSelectionModal from "./TeamSelectionModal";

interface AuctionCardProps {
    player: Player;
    teams: Team[];
    currentBid: number;
    highestBidder: Team | null;
    bids: Bid[];
    onAcceptBid?: (teamId: string, amount: number) => Promise<void>;
    onFinalizeSold: (teamId: string, amount: number) => Promise<void>;
    onMarkUnsold: () => Promise<void>;
    onUndoBid?: () => Promise<void>;
    loading: boolean;
}

const getPositionColor = (position: string) => {
    const pos = (position || "").toLowerCase();
    if (pos === "batsman") return { gradient: "from-amber-400 to-orange-600", light: "#fbbf24", dark: "#ea580c" };
    if (pos === "bowler") return { gradient: "from-blue-400 to-indigo-600", light: "#60a5fa", dark: "#4f46e5" };
    if (pos === "all-rounder") return { gradient: "from-emerald-400 to-teal-600", light: "#34d399", dark: "#059669" };
    if (pos === "wicket-keeper") return { gradient: "from-purple-400 to-pink-600", light: "#c084fc", dark: "#db2777" };
    return { gradient: "from-amber-400 to-yellow-600", light: "#f59e0b", dark: "#d97706" };
};

const AuctionCard: React.FC<AuctionCardProps> = ({
    player,
    teams,
    currentBid,
    highestBidder,
    bids,
    onFinalizeSold,
    onMarkUnsold,
    onUndoBid,
    loading,
}) => {
    const isUnsold = player.status === "unsold";
    const basePrice = isUnsold ? 2000 : 10000;

    const [imageError, setImageError] = useState(false);
    const [amount, setAmount] = useState<number>(currentBid > 0 ? currentBid : basePrice);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(highestBidder?._id || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSoldConfirm, setShowSoldConfirm] = useState(false);
    const [showUnsoldConfirm, setShowUnsoldConfirm] = useState(false);
    const [showUndoConfirm, setShowUndoConfirm] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);

    const enterHeldRef = useRef(false);
    const positionColors = getPositionColor(player.position);
    const currentIncrement = getBidIncrement(amount, isUnsold);
    const nextBidAmount = calculateNextBid(amount, isUnsold);

    // Sync state whenever player or currentBid prop changes
    useEffect(() => {
        setImageError(false);
        setSelectedTeamId(highestBidder?._id || null);
        setShowSoldConfirm(false);
        setShowUnsoldConfirm(false);
        setShowUndoConfirm(false);
        setShowTeamModal(false);
        setAmount(currentBid > 0 ? currentBid : basePrice);
    }, [player._id, player.photoUrl, currentBid, highestBidder, basePrice]);

    // Selected team object
    const selectedTeam = teams.find(t => t._id === selectedTeamId) || null;

    // Handlers: Step Bid Up and Down according to official APL schedule
    const handleIncreaseBid = useCallback(() => {
        setAmount(prev => calculateNextBid(prev, isUnsold));
    }, [isUnsold]);

    const handleDecreaseBid = useCallback(() => {
        setAmount(prev => calculatePreviousBid(prev, isUnsold));
    }, [isUnsold]);

    // Keyboard Listener: 'Enter +' / 'Enter -', '+', '-', 'ArrowUp', 'ArrowDown'
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
                return;
            }

            const isEnter = e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter";
            if (isEnter) {
                enterHeldRef.current = true;
            }

            const isPlus =
                e.key === "+" || e.key === "=" || e.code === "NumpadAdd" || e.code === "Equal" || e.key === "ArrowUp";
            const isMinus =
                e.key === "-" ||
                e.key === "_" ||
                e.code === "NumpadSubtract" ||
                e.code === "Minus" ||
                e.key === "ArrowDown";

            if (isPlus) {
                e.preventDefault();
                handleIncreaseBid();
            } else if (isMinus) {
                e.preventDefault();
                handleDecreaseBid();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const isEnter = e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter";
            if (isEnter) {
                enterHeldRef.current = false;
            }
        };

        const handleBlur = () => {
            enterHeldRef.current = false;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleBlur);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleBlur);
        };
    }, [handleIncreaseBid, handleDecreaseBid]);

    // Handler: Auctioneer clicks SOLD
    const handleSoldClick = () => {
        if (amount <= 0 || loading || isSubmitting) return;

        if (selectedTeam) {
            // Team already selected on card: confirm sale to that team
            setShowSoldConfirm(true);
        } else {
            // No team selected on card: open full TeamSelectionModal
            setShowTeamModal(true);
        }
    };

    // Handler: Confirm sale to team selected on card
    const handleConfirmSold = async () => {
        if (!selectedTeam || amount <= 0 || isSubmitting) return;

        try {
            setIsSubmitting(true);
            setShowSoldConfirm(false);
            await onFinalizeSold(selectedTeam._id, amount);
        } catch (err) {
            console.error("Failed to finalize sale:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handler: Team confirmed from TeamSelectionModal
    const handleModalTeamSelected = async (teamId: string) => {
        setShowTeamModal(false);
        try {
            setIsSubmitting(true);
            await onFinalizeSold(teamId, amount);
        } catch (err) {
            console.error("Failed to finalize sale from modal:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handler: Auctioneer clicks UNSOLD
    const handleUnsoldClick = () => {
        if (amount > basePrice || selectedTeamId) {
            setShowUnsoldConfirm(true);
        } else {
            handleConfirmUnsold();
        }
    };

    // Handler: Confirm mark unsold
    const handleConfirmUnsold = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            setShowUnsoldConfirm(false);
            await onMarkUnsold();
        } catch (err) {
            console.error("Failed to mark unsold:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handler: Undo last bid if bids exist
    const handleConfirmUndo = async () => {
        if (!onUndoBid || isSubmitting || bids.length === 0) return;

        try {
            setIsSubmitting(true);
            setShowUndoConfirm(false);
            await onUndoBid();
        } catch (err) {
            console.error("Failed to undo bid:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auction-card-wrapper w-full h-full flex flex-col flex-1 min-h-0 relative">
            <div className="luxury-auction-card-container relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-2xl shadow-2xl p-4 sm:p-6 xl:p-7 border-2 border-amber-500/40 w-full h-full flex-1 flex flex-col justify-between overflow-hidden min-h-0">
                {/* Ambient Corner Accents */}
                <div className="absolute -top-28 -right-28 w-88 h-88 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-28 -left-28 w-88 h-88 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* 2-COLUMN WIREFRAME LAYOUT */}
                <div className="relative z-10 w-full h-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-7 items-center min-h-0">
                    {/* LEFT COLUMN: Giant Centered Circular Photo */}
                    <div className="lg:col-span-5 xl:col-span-5 flex items-center justify-center h-full min-h-0 py-2">
                        <div className="relative auction-photo-reveal flex items-center justify-center">
                            {/* Outer Rotating Glow Halo */}
                            <div className="absolute -inset-6 sm:-inset-8 auction-rotating-ring pointer-events-none">
                                <div
                                    className={`w-full h-full rounded-full bg-gradient-to-r ${positionColors.gradient} opacity-50 blur-2xl`}
                                ></div>
                            </div>

                            {/* Inner Decorative Ring Border */}
                            <div className="absolute -inset-3 rounded-full border-2 border-amber-400/50 pointer-events-none"></div>

                            {/* Giant Circular Photo Container */}
                            <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-[350px] lg:h-[350px] xl:w-[410px] xl:h-[410px] rounded-full overflow-hidden border-4 border-slate-900 shadow-2xl bg-slate-950 flex items-center justify-center">
                                {!imageError && player.photoUrl && player.photoUrl.trim() !== "" ? (
                                    <img
                                        key={player._id}
                                        src={getImageUrl(player.photoUrl)}
                                        alt={player.name}
                                        onError={() => setImageError(true)}
                                        className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                                        style={{
                                            filter: "contrast(1.05) brightness(1.02)",
                                        }}
                                    />
                                ) : (
                                    <div
                                        className={`w-full h-full bg-gradient-to-br ${positionColors.gradient} flex items-center justify-center text-7xl sm:text-8xl font-black text-white`}
                                        style={{ textShadow: "0 4px 20px rgba(0, 0, 0, 0.6)" }}
                                    >
                                        {player.name ? player.name.charAt(0).toUpperCase() : "P"}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Player Meta + Live Bidding Console */}
                    <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between h-full py-1 min-h-0 space-y-3">
                        {/* Top Details Section */}
                        <div className="auction-fade-2 flex flex-col items-start text-left">
                            <div className="flex items-center justify-between w-full">
                                <h1
                                    className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight theme-gradient-title leading-tight text-left"
                                    style={{
                                        fontFamily: "var(--font-luxury)",
                                    }}
                                >
                                    {player.name}
                                </h1>
                            </div>

                            {/* Badges Row */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span
                                    className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${positionColors.gradient} text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-md border border-white/20`}
                                >
                                    {player.position || "Player"}
                                </span>

                                <span className="px-4 py-1.5 rounded-full bg-slate-800/90 text-amber-300 font-bold text-xs sm:text-sm border border-amber-500/40 shadow-sm flex items-center gap-1.5">
                                    <span className="text-amber-400/60 uppercase text-[11px]">Class:</span>
                                    <span>{player.class || "N/A"}</span>
                                </span>

                                <span
                                    className={`px-3 py-1.5 rounded-full ${isUnsold ? "bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm" : "bg-emerald-950/80 text-emerald-400 border-emerald-500/30"} font-semibold text-xs border flex items-center gap-1.5`}
                                >
                                    {isUnsold ? (
                                        <>
                                            <span className="text-amber-400">⚡</span>
                                            <span>Unsold Round • Base: 2,000 pts</span>
                                        </>
                                    ) : (
                                        <span>Base: 10,000 pts</span>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Live Bidding Console Dock */}
                        <div className="auction-fade-3 flex-1 flex flex-col justify-end">
                            <div className="auction-corner-dock rounded-xl p-3.5 sm:p-4.5 flex flex-col gap-3 shadow-2xl w-full border border-amber-500/30">
                                {/* 1. Current Leading Bid Display */}
                                <div className="bidding-console-header rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80 mb-0.5 flex items-center gap-2">
                                            <span>
                                                {amount > basePrice
                                                    ? "Current Highest Bid"
                                                    : isUnsold
                                                      ? "Unsold Re-Auction Stage"
                                                      : "Auction Opening Stage"}
                                            </span>
                                            {isUnsold && amount < 10000 && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wide">
                                                    +1k Step
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                                                <span className="text-amber-400 text-2xl font-bold">₹</span>
                                                <span>{amount.toLocaleString()}</span>
                                                <span className="text-xs font-semibold text-slate-400">pts</span>
                                            </div>

                                            {/* Luxury Step Buttons */}
                                            <div className="flex items-center gap-2 ml-1">
                                                <button
                                                    type="button"
                                                    onClick={handleDecreaseBid}
                                                    disabled={amount <= basePrice || loading || isSubmitting}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-400 text-xs font-bold transition-all shadow-md flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    title="Decrease bid (Enter - or - key)"
                                                >
                                                    <span className="text-sm font-black">−</span>
                                                    <span>Decrease</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleIncreaseBid}
                                                    disabled={loading || isSubmitting}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-400 text-xs font-bold transition-all shadow-md flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    title="Increase bid (Enter + or + key)"
                                                >
                                                    <span className="text-sm font-black">+</span>
                                                    <span>Increase</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Franchise Selection Grid (Only selected last) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            {selectedTeam && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedTeamId(null)}
                                                    className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold hover:bg-rose-500/30 transition-all flex items-center gap-1"
                                                    title="Deselect calling franchise"
                                                >
                                                    <span>✕ Clear ({selectedTeam.name})</span>
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                                            Next Bid: ₹{nextBidAmount.toLocaleString()} (+
                                            {currentIncrement.toLocaleString()})
                                        </span>
                                    </div>

                                    <div className="franchise-calling-grid">
                                        {teams.map(team => {
                                            const isSelected = selectedTeamId === team._id;
                                            const teamBudget =
                                                team.remainingBudget !== undefined
                                                    ? team.remainingBudget
                                                    : team.budget || 500000;
                                            const canAfford = teamBudget >= amount;
                                            const hasSlots = team.filledSlots < team.totalSlots;
                                            const isEligible = canAfford && hasSlots;

                                            return (
                                                <button
                                                    key={team._id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isEligible) {
                                                            setSelectedTeamId(isSelected ? null : team._id);
                                                        }
                                                    }}
                                                    disabled={!isEligible || loading || isSubmitting}
                                                    className={`franchise-chip ${isSelected ? "selected" : ""}`}
                                                    title={
                                                        !canAfford
                                                            ? `Insufficient budget (${teamBudget.toLocaleString()} pts)`
                                                            : !hasSlots
                                                              ? "No available slots left"
                                                              : isSelected
                                                                ? "Click to deselect"
                                                                : `Set ${team.name} as winning franchise for ₹${amount.toLocaleString()}`
                                                    }
                                                >
                                                    {/* Team Icon */}
                                                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center border border-white/10 shadow-sm">
                                                        {team.logoUrl ? (
                                                            <img
                                                                src={getImageUrl(team.logoUrl)}
                                                                alt={team.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-sm sm:text-base font-black text-amber-400">
                                                                {team.name.charAt(0)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Team Info */}
                                                    <div className="min-w-0 flex-1 text-left">
                                                        <div className="text-sm sm:text-[15px] font-extrabold text-white truncate leading-snug">
                                                            {team.name}
                                                        </div>
                                                        <div className="text-xs sm:text-[13px] text-amber-300/95 font-mono leading-tight mt-0.5">
                                                            ₹{(teamBudget / 1000).toFixed(0)}k • {team.filledSlots}/
                                                            {team.totalSlots}
                                                        </div>
                                                    </div>

                                                    {/* Selected Winner Tag */}
                                                    {isSelected && (
                                                        <span className="text-[10px] sm:text-[11px] bg-emerald-500 text-black px-2 py-0.5 rounded font-black uppercase shadow-sm flex-shrink-0">
                                                            Winner ✓
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 3. Primary Decision Buttons: SOLD & UNSOLD */}
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    {/* SOLD Button */}
                                    <button
                                        type="button"
                                        onClick={handleSoldClick}
                                        disabled={amount <= 0 || loading || isSubmitting}
                                        className="auction-sold-button group relative py-3 px-4 rounded-xl font-black text-sm sm:text-base overflow-hidden transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488] via-[#047857] to-[#065f46] opacity-95"></div>
                                        <div className="absolute inset-0 rounded-xl border border-[#d4af37]/40 group-hover:border-[#d4af37]/80 transition-all"></div>

                                        <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                                            <svg
                                                className="w-5 h-5 drop-shadow-md"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                            </svg>
                                            <span
                                                className="tracking-wider uppercase"
                                                style={{ fontFamily: "Georgia, serif" }}
                                            >
                                                SOLD
                                            </span>
                                        </span>
                                    </button>

                                    {/* UNSOLD Button */}
                                    <button
                                        type="button"
                                        onClick={handleUnsoldClick}
                                        disabled={loading || isSubmitting}
                                        className="auction-unsold-button group relative py-3 px-4 rounded-xl font-black text-sm sm:text-base overflow-hidden transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#be123c] via-[#9f1239] to-[#881337] opacity-95"></div>
                                        <div className="absolute inset-0 rounded-xl border border-[#cd7f32]/40 group-hover:border-[#cd7f32]/80 transition-all"></div>

                                        <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                                            <svg
                                                className="w-5 h-5 drop-shadow-md"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                            </svg>
                                            <span
                                                className="tracking-wider uppercase"
                                                style={{ fontFamily: "Georgia, serif" }}
                                            >
                                                UNSOLD
                                            </span>
                                        </span>
                                    </button>
                                </div>

                                {/* 4. Live Bidding Feed Stream (if bids exist) */}
                                {bids && bids.length > 0 && (
                                    <div className="bidding-feed-container custom-scrollbar mt-1">
                                        <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-amber-400/80 bg-slate-900/90 border-b border-white/5 flex justify-between items-center">
                                            <span>Bidding Stream ({bids.length} bids)</span>
                                            {onUndoBid && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowUndoConfirm(true)}
                                                    disabled={loading || isSubmitting}
                                                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors hover:underline"
                                                    title="Revert last bid"
                                                >
                                                    <span>↺ Undo #{bids[0].bidNumber}</span>
                                                </button>
                                            )}
                                        </div>
                                        {bids.map(b => (
                                            <div key={b._id || b.bidNumber} className="bidding-feed-item">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-amber-400 font-mono text-[11px]">
                                                        #{b.bidNumber}
                                                    </span>
                                                    <span className="text-white font-medium">
                                                        {b.team?.name || "Franchise"}
                                                    </span>
                                                </div>
                                                <span className="font-mono text-amber-300 font-bold">
                                                    ₹{b.amount.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONFIRM SOLD MODAL (Luxury Cartier / Maison Theme) */}
            {showSoldConfirm && selectedTeam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
                    <div
                        className="relative w-full max-w-md rounded-2xl p-6 text-center overflow-hidden"
                        style={{
                            background: "linear-gradient(135deg, rgba(16, 16, 16, 0.98) 0%, rgba(26, 22, 14, 0.96) 50%, rgba(12, 12, 12, 0.98) 100%)",
                            border: "2px solid rgba(212, 175, 55, 0.5)",
                            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.9), 0 0 50px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)"
                        }}
                    >
                        {/* Background Accent Ambient Glow */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Luxury Seal Crest */}
                        <div
                            className="w-16 h-16 mx-auto mb-3.5 rounded-full flex items-center justify-center border-2 border-[#D4AF37]"
                            style={{
                                background: "radial-gradient(circle, #2a2208 0%, #0d0d0d 100%)",
                                boxShadow: "0 0 25px rgba(212, 175, 55, 0.4), inset 0 0 12px rgba(212, 175, 55, 0.2)"
                            }}
                        >
                            <svg className="w-8 h-8 text-[#D4AF37]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                            </svg>
                        </div>

                        {/* Title & Badge */}
                        <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1.5">
                            Official APL Finalization
                        </div>
                        <h3
                            className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400 mb-1"
                            style={{ fontFamily: "var(--font-luxury, 'Playfair Display', serif)" }}
                        >
                            Confirm Player Sale
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">
                            Finalize player assignment according to official rules:
                        </p>

                        {/* Luxury Acquisition Detail Box */}
                        <div
                            className="rounded-xl p-4 mb-5 space-y-3 text-left border"
                            style={{
                                background: "linear-gradient(135deg, rgba(20, 20, 20, 0.85) 0%, rgba(10, 10, 10, 0.95) 100%)",
                                borderColor: "rgba(212, 175, 55, 0.35)",
                                boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.7)"
                            }}
                        >
                            {/* Player Row */}
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Player</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full overflow-hidden border border-amber-400/40 bg-slate-900 flex-shrink-0">
                                        {player.photoUrl ? (
                                            <img src={getImageUrl(player.photoUrl)} alt={player.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-amber-300 font-bold">
                                                {player.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-bold text-white text-sm">
                                        {player.name} <span className="text-amber-400/80 text-xs">({player.position})</span>
                                    </span>
                                </div>
                            </div>

                            {/* Franchise Row */}
                            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Winning Franchise</span>
                                <div className="flex items-center gap-2">
                                    {selectedTeam.logoUrl && (
                                        <img src={getImageUrl(selectedTeam.logoUrl)} alt={selectedTeam.name} className="w-6 h-6 rounded-full object-cover border border-[#D4AF37]/50" />
                                    )}
                                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 text-sm">
                                        {selectedTeam.name}
                                    </span>
                                </div>
                            </div>

                            {/* Final Bid Row */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-amber-500/20">
                                <span className="text-xs text-slate-300 uppercase tracking-wider font-bold">Final Winning Bid</span>
                                <span
                                    className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400"
                                    style={{ textShadow: "0 0 15px rgba(16, 185, 129, 0.4)" }}
                                >
                                    ₹{amount.toLocaleString()} pts
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowSoldConfirm(false)}
                                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:border-amber-500/40 bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-bold text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSold}
                                disabled={isSubmitting}
                                className="group relative overflow-hidden flex-1 py-2.5 px-4 rounded-xl font-black text-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-2"
                                style={{
                                    background: "linear-gradient(135deg, #D4AF37 0%, #F0D770 50%, #D4AF37 100%)",
                                    border: "1px solid rgba(255, 255, 255, 0.3)",
                                    boxShadow: "0 4px 25px rgba(212, 175, 55, 0.45)",
                                    color: "#000000"
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700" />
                                <span className="relative z-10 flex items-center gap-1.5">
                                    {isSubmitting ? "Finalizing..." : "Confirm Sale 🔨"}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM UNSOLD MODAL (Luxury Cartier Theme) */}
            {showUnsoldConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
                    <div
                        className="relative w-full max-w-md rounded-2xl p-6 text-center overflow-hidden"
                        style={{
                            background: "linear-gradient(135deg, rgba(20, 10, 10, 0.98) 0%, rgba(30, 12, 15, 0.96) 50%, rgba(15, 8, 10, 0.98) 100%)",
                            border: "2px solid rgba(239, 68, 68, 0.45)",
                            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.9), 0 0 50px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)"
                        }}
                    >
                        <div
                            className="w-16 h-16 mx-auto mb-3.5 rounded-full flex items-center justify-center border-2 border-rose-500/70"
                            style={{
                                background: "radial-gradient(circle, #2d0a0e 0%, #0d0405 100%)",
                                boxShadow: "0 0 25px rgba(239, 68, 68, 0.35), inset 0 0 12px rgba(239, 68, 68, 0.2)"
                            }}
                        >
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <div className="inline-block px-3 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1.5">
                            Pass to Re-Auction Pool
                        </div>
                        <h3
                            className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-200 to-rose-400 mb-2"
                            style={{ fontFamily: "var(--font-luxury, 'Playfair Display', serif)" }}
                        >
                            Confirm Unsold
                        </h3>
                        <p className="text-sm text-slate-300 mb-2">
                            Current bid is{" "}
                            <span className="text-amber-400 font-bold">₹{amount.toLocaleString()} pts</span>
                            {selectedTeam ? (
                                <span>
                                    {" "}
                                    with candidate <span className="text-amber-300 font-bold">{selectedTeam.name}</span>
                                </span>
                            ) : (
                                ""
                            )}
                            .
                        </p>
                        <p className="text-xs text-rose-400/90 mb-5 font-semibold">
                            Are you sure you want to pass this player as UNSOLD to the rapid-fire pool?
                        </p>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowUnsoldConfirm(false)}
                                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-bold text-sm transition-all"
                            >
                                Keep Bidding
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUnsold}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-sm shadow-lg shadow-rose-900/40 transition-all"
                            >
                                {isSubmitting ? "Processing..." : "Mark Unsold"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM UNDO MODAL (Luxury Cartier Theme) */}
            {showUndoConfirm && bids && bids.length > 0 && onUndoBid && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
                    <div
                        className="relative w-full max-w-md rounded-2xl p-6 text-center overflow-hidden"
                        style={{
                            background: "linear-gradient(135deg, rgba(18, 16, 12, 0.98) 0%, rgba(28, 22, 12, 0.96) 50%, rgba(14, 12, 10, 0.98) 100%)",
                            border: "2px solid rgba(212, 175, 55, 0.45)",
                            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.9), 0 0 50px rgba(212, 175, 55, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)"
                        }}
                    >
                        <div
                            className="w-16 h-16 mx-auto mb-3.5 rounded-full flex items-center justify-center border-2 border-[#D4AF37]"
                            style={{
                                background: "radial-gradient(circle, #2a2208 0%, #0d0d0d 100%)",
                                boxShadow: "0 0 25px rgba(212, 175, 55, 0.35), inset 0 0 12px rgba(212, 175, 55, 0.2)"
                            }}
                        >
                            <span className="text-3xl text-amber-400">↺</span>
                        </div>
                        <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1.5">
                            Bid Rollback
                        </div>
                        <h3
                            className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400 mb-1"
                            style={{ fontFamily: "var(--font-luxury, 'Playfair Display', serif)" }}
                        >
                            Confirm Undo Last Bid
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">
                            Roll back the latest accepted bid due to a mistouch:
                        </p>

                        <div
                            className="rounded-xl p-4 mb-5 space-y-2 text-left border"
                            style={{
                                background: "linear-gradient(135deg, rgba(20, 20, 20, 0.85) 0%, rgba(10, 10, 10, 0.95) 100%)",
                                borderColor: "rgba(212, 175, 55, 0.35)"
                            }}
                        >
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Bid to Remove:</span>
                                <span className="font-bold text-rose-400">
                                    #{bids[0].bidNumber} • ₹{bids[0].amount.toLocaleString()} pts
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Calling Franchise:</span>
                                <span className="font-bold text-white">{bids[0].team?.name || "Franchise"}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pt-2 border-t border-amber-500/20">
                                <span className="text-slate-400">Reverts Auction to:</span>
                                <span className="font-black text-amber-400">
                                    {bids.length > 1
                                        ? `₹${bids[1].amount.toLocaleString()} pts (${bids[1].team?.name})`
                                        : "Base Price: ₹10,000 pts (No Leader)"}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowUndoConfirm(false)}
                                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:border-amber-500/40 bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-bold text-sm transition-all"
                            >
                                Keep Current Bid
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUndo}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-sm shadow-lg transition-all"
                            >
                                {isSubmitting ? "Reverting..." : "Confirm Undo ↺"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TEAM SELECTION MODAL (when SOLD is clicked without picking team on card) */}
            <TeamSelectionModal
                isOpen={showTeamModal}
                onClose={() => setShowTeamModal(false)}
                teams={teams}
                soldAmount={amount}
                onSelectTeam={handleModalTeamSelected}
            />
        </div>
    );
};

export default AuctionCard;

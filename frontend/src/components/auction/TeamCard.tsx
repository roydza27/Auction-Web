import React from 'react';
import { Team } from '../../types';
import { getImageUrl } from '../../utils/imageUtils';

interface TeamCardProps {
  team: Team;
  compact?: boolean;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, compact = false }) => {
  const budgetPercentage = team.budget && team.remainingBudget 
    ? ((team.remainingBudget / team.budget) * 100) 
    : 0;

  const slotsPercentage = team.totalSlots && team.filledSlots
    ? ((team.filledSlots / team.totalSlots) * 100)
    : 0;

  const getBudgetColor = () => {
    if (budgetPercentage > 50) return { from: 'var(--theme-gold-champagne)', to: 'var(--theme-gold-amber)', tw: 'from-yellow-400 to-amber-500' };
    if (budgetPercentage > 25) return { from: 'var(--theme-gold-champagne)', to: 'var(--theme-bronze-dark)', tw: 'from-yellow-400 to-amber-500' };
    return { from: 'var(--theme-bronze-wine)', to: 'var(--theme-bronze-wine-light)', tw: 'from-amber-500 to-yellow-600' };
  };

  const getSlotsColor = () => {
    if (slotsPercentage < 50) return { from: 'var(--theme-bronze-wine)', to: 'var(--theme-bronze-wine-light)', tw: 'from-blue-900 to-purple-900' };
    if (slotsPercentage < 80) return { from: 'var(--theme-bronze-wine)', to: 'var(--theme-bronze-dark)', tw: 'from-purple-900 to-purple-600' };
    return { from: 'var(--theme-gold-champagne)', to: 'var(--theme-gold-amber)', tw: 'from-yellow-400 to-amber-500' };
  };

  const budgetColors = getBudgetColor();
  const slotsColors = getSlotsColor();

  if (compact) {
    return (
      <div className="group relative">
        {/* Gold Glow Effect */}
        <div style={{
          position: 'absolute',
          inset: '-2px',
          background: 'linear-gradient(135deg, rgba(176, 139, 79, 0.3), rgba(176, 139, 79, 0.2))',
          borderRadius: '12px',
          filter: 'blur(8px)',
          opacity: 0.2,
          transition: 'opacity 300ms'
        }} className="group-hover:opacity-40"></div>
        
        {/* Premium Black Card */}
        <div className="relative theme-card p-2.5 sm:p-3 hover:border-[rgba(212,175,55,0.4)]">
          {/* Team Name with Gold Icon */}
          <div className="flex items-center gap-2 mb-2">
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {team.logoUrl ? (
                <img
                  src={getImageUrl(team.logoUrl)}
                  alt={team.name}
                  className="w-full h-full object-cover rounded-[8px]"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.compact-fallback');
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`compact-fallback w-full h-full rounded-[8px] items-center justify-center ${
                  team.logoUrl ? 'hidden' : 'flex'
                }`}
                style={{
                  background: 'linear-gradient(135deg, #B08B4F, #C99D5F)',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  color: '#0E0E12',
                  boxShadow: '0 0 20px rgba(176, 139, 79, 0.4)'
                }}
              >
                {team.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <h3 style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              fontSize: '1rem',
              color: '#FFFFFF',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.03em',
              textShadow: '0 2px 8px rgba(176, 139, 79, 0.3)'
            }}>{team.name}</h3>
          </div>

          {/* Stats */}
          <div className="space-y-2">
            {/* Budget */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span style={{
                  fontSize: '11px',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 700,
                  color: '#B0B0B8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  Budget
                </span>
                <span style={{
                  fontSize: '15px',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  color: '#FFD700',
                  textShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
                }}>
                  ₹{team.remainingBudget?.toLocaleString()}
                </span>
              </div>
              <div style={{
                height: '6px',
                background: 'rgba(26, 26, 31, 0.6)',
                borderRadius: '9999px',
                overflow: 'hidden',
                border: '1px solid rgba(176, 139, 79, 0.25)'
              }}>
                <div 
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${budgetColors.from}, ${budgetColors.to})`,
                    borderRadius: '9999px',
                    transition: 'width 500ms',
                    width: `${budgetPercentage}%`,
                    boxShadow: '0 0 10px rgba(176, 139, 79, 0.4)'
                  }}
                ></div>
              </div>
            </div>

            {/* Slots */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span style={{
                  fontSize: '11px',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 700,
                  color: '#B0B0B8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  Players
                </span>
                <span style={{
                  fontSize: '14px',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  color: '#F5F5F5'
                }}>
                  {team.filledSlots}/{team.totalSlots}
                </span>
              </div>
              <div style={{
                height: '6px',
                background: 'rgba(26, 26, 31, 0.6)',
                borderRadius: '9999px',
                overflow: 'hidden',
                border: '1px solid rgba(176, 139, 79, 0.25)'
              }}>
                <div 
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${slotsColors.from}, ${slotsColors.to})`,
                    borderRadius: '9999px',
                    transition: 'width 500ms',
                    width: `${slotsPercentage}%`,
                    boxShadow: slotsPercentage > 0 ? '0 0 10px rgba(176, 139, 79, 0.3)' : 'none'
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Gold Bottom Accent */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, rgba(176, 139, 79, 0.3), #B08B4F, rgba(176, 139, 79, 0.3))',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px'
          }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {/* Premium Gold Glow Effect */}
      <div style={{
        position: 'absolute',
        inset: '-4px',
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.4), rgba(255, 215, 0, 0.3), rgba(212, 175, 55, 0.4))',
        borderRadius: '20px',
        filter: 'blur(16px)',
        opacity: 0.3,
        transition: 'opacity 500ms'
      }} className="group-hover:opacity-50 animate-pulse"></div>
      
      {/* Premium Black Glass Card */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(26, 26, 26, 0.9), rgba(0, 0, 0, 0.95))',
        backdropFilter: 'blur(25px)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(212, 175, 55, 0.15)',
        border: '1px solid rgba(212, 175, 55, 0.25)'
      }}>
        {/* Top Gold Accent */}
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.3), #FFD700, #D4AF37, #FFD700, rgba(212, 175, 55, 0.3))',
          boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
        }}></div>
        
        <div className="p-6">
          {/* Team Header */}
          <div className="flex items-center gap-4 mb-6">
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
                transform: 'scale(1)',
                transition: 'transform 300ms'
              }}
              className="group-hover:scale-110"
            >
              {team.logoUrl ? (
                <img
                  src={getImageUrl(team.logoUrl)}
                  alt={team.name}
                  className="w-full h-full object-cover rounded-[16px] border border-amber-400/40"
                  style={{
                    boxShadow: '0 0 30px rgba(212, 175, 55, 0.5)'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.full-fallback');
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`full-fallback w-full h-full rounded-[16px] items-center justify-center ${
                  team.logoUrl ? 'hidden' : 'flex'
                }`}
                style={{
                  background: 'linear-gradient(135deg, #FFD700, #D4AF37, #FFD700)',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 900,
                  fontSize: '1.5rem',
                  color: '#000000',
                  boxShadow: '0 0 30px rgba(212, 175, 55, 0.5), inset 0 2px 10px rgba(255, 255, 255, 0.2)'
                }}
              >
                {team.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: '1.5rem',
                color: '#FFFFFF',
                marginBottom: '4px',
                textShadow: '0 2px 12px rgba(212, 175, 55, 0.3)',
                letterSpacing: '0.02em'
              }}>{team.name}</h3>
              <p style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#9ca3af'
              }}>Team Overview</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="space-y-4">
            {/* Total Budget */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.6), rgba(0, 0, 0, 0.4))',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
              <div className="flex justify-between items-center mb-2">
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Total Budget
                </span>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#FFFFFF'
                }}>
                  ₹{team.budget?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Remaining Budget */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.6), rgba(0, 0, 0, 0.4))',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
              <div className="flex justify-between items-center mb-2">
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Remaining
                </span>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#FFD700',
                  textShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
                }}>
                  ₹{team.remainingBudget?.toLocaleString()}
                </span>
              </div>
              <div style={{
                height: '12px',
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '9999px',
                overflow: 'hidden',
                marginTop: '8px',
                border: '1px solid rgba(212, 175, 55, 0.2)'
              }}>
                <div 
                  className={`h-full bg-gradient-to-r ${budgetColors.tw} rounded-full transition-all duration-500`}
                  style={{ 
                    width: `${budgetPercentage}%`,
                    boxShadow: '0 0 15px rgba(212, 175, 55, 0.4)'
                  }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#9ca3af'
                }}>{budgetPercentage.toFixed(0)}% left</span>
              </div>
            </div>

            {/* Players */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.6), rgba(0, 0, 0, 0.4))',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
              <div className="flex justify-between items-center mb-2">
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Squad
                </span>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#FFFFFF'
                }}>
                  {team.filledSlots} / {team.totalSlots}
                </span>
              </div>
              <div style={{
                height: '12px',
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '9999px',
                overflow: 'hidden',
                marginTop: '8px',
                border: '1px solid rgba(212, 175, 55, 0.2)'
              }}>
                <div 
                  className={`h-full bg-gradient-to-r ${slotsColors.tw} rounded-full transition-all duration-500`}
                  style={{ 
                    width: `${slotsPercentage}%`,
                    boxShadow: slotsPercentage > 0 ? '0 0 15px rgba(212, 175, 55, 0.3)' : 'none'
                  }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#9ca3af'
                }}>{slotsPercentage.toFixed(0)}% filled</span>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#9ca3af'
                }}>{team.totalSlots - (team.filledSlots || 0)} slots left</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Gold Accent */}
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.3), #FFD700, #D4AF37, #FFD700, rgba(212, 175, 55, 0.3))',
          boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
        }}></div>
      </div>
    </div>
  );
};

export default TeamCard;

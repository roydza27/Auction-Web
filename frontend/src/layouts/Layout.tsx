import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  
  const navigation = [
    { name: 'Auction', href: '/' },
    { name: 'Teams', href: '/teams' },
    { name: 'Players', href: '/players' },
    { name: 'Unsold', href: '/unsold' },
    { name: 'Results', href: '/results' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Premium Header */}
      <header className="flex-shrink-0 theme-header">
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between h-20">
            {/* Logo Section */}
            <div className="flex items-center -ml-2">
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="w-16 h-16 flex items-center justify-center">
                  <img 
                    src="/logo.png" 
                    alt="College Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.fallback-icon')) {
                        const fallback = document.createElement('span');
                        fallback.className = 'fallback-icon';
                        fallback.textContent = '⚡';
                        fallback.style.fontSize = '24px';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-[1.75rem] font-bold leading-tight tracking-[0.05em] theme-gradient-title-alt" style={{ fontFamily: "var(--font-luxury)" }}>
                    SPORTS AUCTION
                  </h1>
                  <p className="text-[0.75rem] font-medium tracking-[0.15em] uppercase text-gold opacity-90" style={{ fontFamily: "var(--font-modern)" }}>
                    St Aloysius (Deemed To Be University)
                  </p>
                </div>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden lg:ml-10 lg:flex lg:space-x-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group relative theme-nav-link ${isActive ? 'theme-nav-link-active' : ''}`}
                    >
                      {item.name}
                      {isActive && <div className="theme-nav-indicator" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Side - Status/User Area */}
            <div className="flex items-center gap-4">
              <div className="relative theme-stat-box px-4 py-2 text-xs font-semibold tracking-wider uppercase" style={{
                borderRadius: '20px',
                color: 'var(--theme-gold-champagne)',
                animation: 'liveBorderGlow 3s ease-in-out infinite',
                overflow: 'hidden'
              }}>
                {/* Animated Border Glow */}
                <span style={{
                  position: 'absolute',
                  inset: '-2px',
                  background: 'linear-gradient(135deg, var(--theme-gold-champagne) 0%, var(--theme-gold-amber) 50%, var(--theme-gold-champagne) 100%)',
                  backgroundSize: '200% 200%',
                  borderRadius: '20px',
                  filter: 'blur(6px)',
                  opacity: 0.15,
                  animation: 'liveGlowShift 3s ease-in-out infinite',
                  zIndex: -1
                }}></span>
                
                {/* Text with gradient animation */}
                <span style={{
                  background: 'linear-gradient(135deg, var(--theme-gold-champagne) 0%, var(--theme-gold-amber) 50%, var(--theme-gold-champagne) 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'liveTextShimmer 3s ease-in-out infinite',
                  fontWeight: 700,
                  filter: 'drop-shadow(0 2px 4px rgba(176, 139, 79, 0.3))'
                }}>
                  ● LIVE
                </span>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes liveBorderGlow {
            0%, 100% {
              border-color: rgba(176, 139, 79, 0.25);
              filter: drop-shadow(0 2px 8px rgba(176, 139, 79, 0.15));
            }
            50% {
              border-color: rgba(176, 139, 79, 0.45);
              filter: drop-shadow(0 4px 12px rgba(176, 139, 79, 0.25)) drop-shadow(0 0 20px rgba(176, 139, 79, 0.15));
            }
          }
          
          @keyframes liveGlowShift {
            0%, 100% {
              background-position: 0% 50%;
              opacity: 0.12;
            }
            50% {
              background-position: 100% 50%;
              opacity: 0.2;
            }
          }
          
          @keyframes liveTextShimmer {
            0%, 100% {
              background-position: 0% 50%;
              filter: drop-shadow(0 2px 4px rgba(176, 139, 79, 0.3));
            }
            50% {
              background-position: 100% 50%;
              filter: drop-shadow(0 2px 6px rgba(176, 139, 79, 0.4));
            }
          }
        `}</style>

        {/* Mobile Navigation - Below header */}
        <div className="lg:hidden border-t" style={{
          borderColor: 'rgba(212, 175, 55, 0.2)',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)'
        }}>
          <nav className="flex overflow-x-auto px-4 py-2 gap-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`whitespace-nowrap theme-nav-link text-xs px-3.5 py-2 ${isActive ? 'theme-nav-link-active' : ''}`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default Layout;
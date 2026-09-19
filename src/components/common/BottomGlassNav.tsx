import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, User } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { ActiveView } from '../../types';

export const BottomGlassNav: React.FC = () => {
  const { activeView, setActiveView, isAuthenticated, openAuthModal } = useMarketplace();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // When scrolled past top section (approx 160px), show bottom glass nav
      const currentScroll = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(currentScroll > 160);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigate = (view: ActiveView) => {
    if (!isAuthenticated && (view === 'sell' || view === 'profile')) {
      const message = view === 'sell'
        ? 'বই বিক্রি করতে প্রথমে লগইন করুন (Please log in to list and sell books)'
        : 'আপনার প্রোফাইল দেখতে লগইন করুন (Please log in to view profile)';
      openAuthModal('login', message);
      return;
    }
    setActiveView(view);
    // Smooth scroll back to top if desired or keep position
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      id="bottom-glass-nav"
      className={`fixed bottom-4 sm:bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none transition-all duration-300 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-6 scale-95 pointer-events-none'
      }`}
      aria-hidden={!isVisible}
    >
      {/* Medium Glass Floating Pill Dock */}
      <nav
        className="pointer-events-auto flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-2.5 sm:py-2 bg-white/45 backdrop-blur-2xl border border-white/60 shadow-[0_12px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.85)] ring-1 ring-black/[0.04] rounded-full select-none transition-colors duration-200"
        aria-label="Quick Bottom Navigation"
      >
        {/* 1. Books (Browse) */}
        <button
          type="button"
          onClick={() => handleNavigate('browse')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer ${
            activeView === 'browse'
              ? 'bg-white/80 text-[#ef4d23] font-semibold shadow-2xs backdrop-blur-md'
              : 'text-neutral-800 hover:text-neutral-950 hover:bg-white/50'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Books</span>
        </button>

        {/* 2. Sell Now (Center CTA) */}
        <button
          type="button"
          onClick={() => handleNavigate('sell')}
          className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer shadow-xs ${
            activeView === 'sell'
              ? 'bg-[#ef4d23] text-white ring-2 ring-[#ef4d23]/30 font-semibold'
              : 'bg-[#ef4d23]/90 hover:bg-[#ef4d23] text-white hover:shadow-sm'
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Sell Now</span>
        </button>

        {/* 3. Profile */}
        <button
          type="button"
          onClick={() => handleNavigate('profile')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer ${
            activeView === 'profile'
              ? 'bg-white/80 text-[#ef4d23] font-semibold shadow-2xs backdrop-blur-md'
              : 'text-neutral-800 hover:text-neutral-950 hover:bg-white/50'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

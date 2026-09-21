import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Menu,
  X,
  Bookmark,
  Bell,
  ShieldCheck,
  Compass,
  ShoppingBag,
  Home,
  PlusCircle,
  LogIn,
  LogOut,
  FileQuestion,
  BookOpen,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { ActiveView } from '../types';
import { UserAvatar } from './common/UserAvatar';
import { IlldoorLogo } from './common/IlldoorLogo';

export const Navbar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    wishlistIds,
    unreadNotificationCount,
    currentUser,
    isAuthenticated,
    isAdmin,
    openAuthModal,
    signOut,
  } = useMarketplace();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pagesDropdownOpen, setPagesDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const handleNavClick = (view: ActiveView) => {
    if (!isAuthenticated && (view === 'sell' || view === 'orders' || view === 'profile' || view === 'admin' || view === 'notifications')) {
      const message = view === 'sell'
        ? 'বই বিক্রি করতে প্রথমে লগইন করুন (Please log in to list and sell books)'
        : 'এই ফিচারটি ব্যবহার করতে প্রথমে লগইন করুন (Please log in to continue)';
      openAuthModal('login', message);
      return;
    }
    setActiveView(view);
    setMobileMenuOpen(false);
    setPagesDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPagesDropdownOpen(false);
      }
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav
      ref={navRef}
      id="floating-nav-pill"
      className="bg-white/95 backdrop-blur-md rounded-full shadow-sm border border-neutral-200/90 px-2.5 sm:px-4 py-1.5 sm:py-2 w-full max-w-[880px] relative z-40 sm:z-50 flex items-center justify-between select-none"
    >
      {/* Logo: EXACTLY ONE ILLDOOR Animated Logo */}
      <button
        onClick={() => handleNavClick('home')}
        className="shrink-0 flex items-center pl-0.5 sm:pl-1 cursor-pointer focus:outline-none"
        aria-label="ILLDOOR Logo"
      >
        <IlldoorLogo height={27} mobileHeight={21} />
      </button>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-3 lg:gap-5 text-[13px] lg:text-[14px] ml-2 lg:ml-4 font-medium text-neutral-800 shrink-0">
        <button
          onClick={() => handleNavClick('home')}
          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeView === 'home'
              ? 'text-neutral-900 font-semibold'
              : 'text-neutral-700 hover:text-[#ef4d23]'
          }`}
        >
          <span>Home</span>
          {activeView === 'home' && (
            <span className="w-[2px] h-[2px] bg-neutral-900 rounded-full inline-block" />
          )}
        </button>

        <button
          onClick={() => handleNavClick('browse')}
          className={`transition-colors cursor-pointer whitespace-nowrap ${
            activeView === 'browse'
              ? 'text-neutral-900 font-semibold'
              : 'text-neutral-700 hover:text-[#ef4d23]'
          }`}
        >
          Browse Books
        </button>

        <button
          onClick={() => handleNavClick('requests')}
          className={`transition-colors cursor-pointer whitespace-nowrap ${
            activeView === 'requests'
              ? 'text-neutral-900 font-semibold'
              : 'text-neutral-700 hover:text-[#ef4d23]'
          }`}
        >
          Book Requests
        </button>

        <button
          onClick={() => handleNavClick('orders')}
          className={`transition-colors cursor-pointer whitespace-nowrap ${
            activeView === 'orders'
              ? 'text-neutral-900 font-semibold'
              : 'text-neutral-700 hover:text-[#ef4d23]'
          }`}
        >
          My Orders
        </button>

        {/* Pages Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setPagesDropdownOpen(!pagesDropdownOpen)}
            className="inline-flex items-center gap-1 text-[#ef4d23] hover:opacity-85 transition-opacity cursor-pointer font-medium whitespace-nowrap"
          >
            <span>More</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${pagesDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {pagesDropdownOpen && (
            <div className="absolute top-full left-0 mt-3 w-52 bg-white rounded-2xl shadow-xl border border-neutral-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => handleNavClick('wishlist')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-800 hover:bg-neutral-50 text-xs font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Bookmark className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Wishlist</span>
                </div>
                {wishlistIds.length > 0 && (
                  <span className="bg-[#ef4d23] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {wishlistIds.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleNavClick('semester-bundles')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-800 hover:bg-neutral-50 text-xs font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Semester Bundles</span>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('requests')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-800 hover:bg-neutral-50 text-xs font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileQuestion className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Request Board</span>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('notifications')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-800 hover:bg-neutral-50 text-xs font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Notifications</span>
                </div>
                {unreadNotificationCount > 0 && (
                  <span className="bg-[#ef4d23] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleNavClick('admin')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-800 hover:bg-neutral-50 text-xs font-medium cursor-pointer border-t border-neutral-100 mt-1 pt-2"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#ef4d23]" />
                    <span className="font-semibold text-neutral-900">Admin Console</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-white bg-[#ef4d23] px-1.5 py-0.5 rounded-md">Admin</span>
                </button>
              )}

              {isAuthenticated && (
                <button
                  onClick={async () => {
                    await signOut();
                    setPagesDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer border-t border-neutral-100 mt-1 pt-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Wishlist / ShoppingCart icon */}
        <button
          type="button"
          onClick={() => handleNavClick('wishlist')}
          aria-label="Wishlist and Saved Books"
          className="relative flex items-center justify-center text-neutral-700 hover:text-neutral-900 w-8 h-8 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          {wishlistIds.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#ef4d23] text-white text-[10px] font-bold flex items-center justify-center">
              {wishlistIds.length}
            </span>
          )}
        </button>

        {/* Direct Admin Pill for Admin Accounts */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => handleNavClick('admin')}
            title="Admin Dashboard"
            className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              activeView === 'admin'
                ? 'bg-[#ef4d23] text-white'
                : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        )}

        {/* Orange button */}
        <button
          type="button"
          onClick={() => handleNavClick('sell')}
          className="inline-flex items-center gap-1 sm:gap-1.5 bg-[#ef4d23] hover:bg-[#de3d13] text-white rounded-full pl-2.5 sm:pl-3 pr-1.5 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-xs whitespace-nowrap"
        >
          <span>
            <span className="hidden sm:inline">Sell Book</span>
            <span className="sm:hidden">Sell</span>
          </span>
          <span className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-white/20 flex items-center justify-center">
            <ChevronRight className="w-3 h-3 text-white" />
          </span>
        </button>

        {/* User profile avatar or Login Button */}
        {isAuthenticated ? (
          <button
            onClick={() => handleNavClick('profile')}
            title={`${currentUser.name} (${currentUser.department})`}
            className="flex items-center cursor-pointer p-0.5 rounded-full border border-neutral-200 hover:border-neutral-300 transition-colors"
          >
            <UserAvatar
              src={currentUser.avatar}
              name={currentUser.name}
              size="sm"
              isVerified={currentUser.isVerified}
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold text-neutral-800 hover:text-black bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogIn className="w-3.5 h-3.5 text-[#ef4d23]" />
            <span>Login</span>
          </button>
        )}

        {/* Mobile hamburger button */}
        <button
          id="mobile-menu-btn"
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          className="md:hidden p-1.5 text-neutral-700 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer ml-0.5"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {mobileMenuOpen && (
        <div
          id="mobile-dropdown"
          className="absolute top-full left-0 right-0 mt-2 bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-200/90 p-3 z-50 flex flex-col gap-2 text-[14px] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* User Quick Info or Login Banner */}
          {isAuthenticated ? (
            <div
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-3 p-2 rounded-xl bg-neutral-50 cursor-pointer"
            >
              <UserAvatar
                src={currentUser.avatar}
                name={currentUser.name}
                size="sm"
                isVerified={currentUser.isVerified}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-900 truncate">
                  {currentUser.name}
                </p>
                <p className="text-[11px] text-neutral-500 truncate">
                  {currentUser.department} • রোল #{currentUser.studentId}
                </p>
              </div>
              <span className="text-[11px] text-[#ef4d23] font-medium">Profile →</span>
            </div>
          ) : (
            <div
              onClick={() => {
                openAuthModal('login');
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-[#ef4d23]/10 to-[#ff7a45]/10 border border-[#ef4d23]/20 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#ef4d23] text-white flex items-center justify-center font-bold text-xs">
                  <LogIn className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">Login / Register</p>
                  <p className="text-[10px] text-neutral-500">Buy & sell used books</p>
                </div>
              </div>
              <span className="text-xs text-[#ef4d23] font-semibold">Login →</span>
            </div>
          )}

          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center justify-between px-3 py-2 rounded-xl text-neutral-900 font-medium hover:bg-neutral-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-neutral-500" />
              <span>Home</span>
            </div>
            <span className="w-[1.5px] h-[1.5px] bg-neutral-900 rounded-full" />
          </button>

          <button
            onClick={() => handleNavClick('browse')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 font-medium transition-colors text-left cursor-pointer"
          >
            <Compass className="w-4 h-4 text-neutral-500" />
            <span>Browse Books</span>
          </button>

          <button
            onClick={() => handleNavClick('semester-bundles')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 font-medium transition-colors text-left cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-neutral-500" />
            <span>Semester Bundles</span>
          </button>

          <button
            onClick={() => handleNavClick('requests')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 font-medium transition-colors text-left cursor-pointer"
          >
            <FileQuestion className="w-4 h-4 text-neutral-500" />
            <span>Book Requests</span>
          </button>

          <button
            onClick={() => handleNavClick('orders')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 font-medium transition-colors text-left cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-neutral-500" />
            <span>My Orders</span>
          </button>

          <button
            onClick={() => handleNavClick('wishlist')}
            className="flex items-center justify-between px-3 py-2 rounded-xl text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 font-medium transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-neutral-500" />
              <span>Wishlist</span>
            </div>
            {wishlistIds.length > 0 && (
              <span className="text-xs bg-[#ef4d23] text-white font-bold px-2 py-0.5 rounded-full">
                {wishlistIds.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('notifications')}
            className="flex items-center justify-between px-3 py-2 rounded-xl text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 font-medium transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-neutral-500" />
              <span>Notifications</span>
            </div>
            {unreadNotificationCount > 0 && (
              <span className="text-xs bg-[#ef4d23] text-white font-bold px-2 py-0.5 rounded-full">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('admin')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 font-medium transition-colors text-left cursor-pointer border-t border-neutral-100 pt-2"
          >
            <ShieldCheck className="w-4 h-4 text-neutral-500" />
            <span>Admin Console</span>
          </button>

          {isAuthenticated && (
            <button
              onClick={async () => {
                await signOut();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-medium transition-colors text-left cursor-pointer border-t border-neutral-100 pt-2"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

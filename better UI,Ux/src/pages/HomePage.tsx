import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Navbar } from '../components/Navbar';
import { BookCard } from '../components/BookCard';
import { PICKUP_POINTS } from '../data/mockData';

// Reusable SVG Gauge matching the reference design
const GaugeSvg: React.FC<{
  value: number;
  color: string;
  inactiveColor?: string;
  textColor?: string;
  text?: string;
}> = ({
  value,
  color,
  inactiveColor = '#d4d4d8',
  textColor = '#111827',
  text,
}) => {
  const totalTicks = 40;
  const activeCount = Math.round((value / 100) * totalTicks);
  const cx = 100;
  const cy = 100;
  const rOuter = 80;
  const rInner = 70;

  return (
    <svg viewBox="0 0 200 120" className="w-full h-auto overflow-visible select-none">
      {Array.from({ length: totalTicks }).map((_, i) => {
        const angle = Math.PI + (i / (totalTicks - 1)) * Math.PI;
        const x1 = (cx + rInner * Math.cos(angle)).toFixed(2);
        const y1 = (cy + rInner * Math.sin(angle)).toFixed(2);
        const x2 = (cx + rOuter * Math.cos(angle)).toFixed(2);
        const y2 = (cy + rOuter * Math.sin(angle)).toFixed(2);
        const strokeColor = i < activeCount ? color : inactiveColor;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
      })}
      <text
        x="100"
        y="105"
        textAnchor="middle"
        fontSize="22"
        fontWeight="600"
        fill={textColor}
      >
        {text || `${value}%`}
      </text>
    </svg>
  );
};

export const HomePage: React.FC = () => {
  const { books, setActiveView, applyQuickSubjectSearch } = useMarketplace();

  // Card 1 interactive state: Student savings / book trades
  const [savingsToggle, setSavingsToggle] = useState<'savings' | 'books'>('savings');

  // Mobile tray active tab
  const [mobileTab, setMobileTab] = useState<'savings' | 'matcher' | 'escrow'>('savings');

  // Card 2 interactive form state: Syllabus book matcher
  const [filterDept, setFilterDept] = useState('Computer Technology');
  const [filterSemester, setFilterSemester] = useState('All Semesters');
  const [filterCode, setFilterCode] = useState('66641');
  const [targetBudget, setTargetBudget] = useState('180');
  const [savedBanner, setSavedBanner] = useState(false);

  // Card 3 interactive state: Campus handover & escrow
  const [handoverToggle, setHandoverToggle] = useState<'booths' | 'library'>('booths');

  // Top featured & high savings books
  const featuredBooks = books.slice(0, 4);
  const highSavingsBooks = [...books]
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 4);

  const departments = [
    { name: 'Computer Technology', count: '120+ Books', code: '666xx' },
    { name: 'Civil Technology', count: '95+ Books', code: '670xx' },
    { name: 'Electrical Technology', count: '80+ Books', code: '667xx' },
    { name: 'Mechanical Technology', count: '65+ Books', code: '668xx' },
    { name: 'Electronics Technology', count: '45+ Books', code: '668xx' },
    { name: 'Architecture Technology', count: '35+ Books', code: '671xx' },
  ];

  const handleSaveForm = () => {
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
    if (filterDept) {
      applyQuickSubjectSearch(filterDept);
    }
  };

  const handleResetForm = () => {
    setFilterDept('Computer Technology');
    setFilterSemester('All Semesters');
    setFilterCode('66641');
    setTargetBudget('180');
  };

  return (
    <div className="w-full">
      {/* Hero container */}
      <section
        id="hero-container"
        className="relative w-full min-h-[660px] md:min-h-[820px] lg:min-h-[920px] overflow-hidden bg-[#d9d9d9] rounded-2xl sm:rounded-3xl flex flex-col justify-between shadow-sm select-none"
      >
        {/* Background Video */}
        <video
          id="hero-video"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4"
          poster="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disableRemotePlayback
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Above the video: absolute inset-0 bg-white/10 overlay */}
        <div className="absolute inset-0 bg-white/10 pointer-events-none" />

        {/* Foreground content wrapper: relative z-10 */}
        <div className="relative z-10 flex-1 flex flex-col justify-between">
          {/* Navbar (floating pill) */}
          <header className="flex justify-center pt-3 sm:pt-6 px-2 sm:px-4 w-full">
            <Navbar />
          </header>

          {/* Hero Content (centered) */}
          <div className="flex flex-col items-center px-3 sm:px-4 pt-3 sm:pt-10 md:pt-12 pb-2 sm:pb-6 text-center shrink-0 my-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white rounded-full px-3 sm:px-4 py-1 sm:py-1.5 shadow-xs text-[11px] sm:text-[13px] font-medium text-neutral-800 border border-neutral-100">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#ef4d23]" />
              <span>PolyBook Marketplace</span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: 'clamp(28px, 6.5vw, 72px)',
                lineHeight: 1.08,
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
              className="mt-3 sm:mt-6 max-w-4xl text-neutral-900"
            >
              Shaping <span className="font-instrument italic font-normal">Campus Learning</span><br />of tomorrow
            </h1>

            {/* Subtitle */}
            <p
              style={{ fontSize: 'clamp(12px, 3.2vw, 16px)' }}
              className="mt-2 sm:mt-6 text-neutral-700 px-2 max-w-2xl font-normal leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none"
            >
              The verified peer-to-peer textbook marketplace for Polytechnic diploma
              students. Safe campus pickup points, transparent ratings, and ৳0 commission.
            </p>

            {/* CTA button (Frosted Glass with light sheen & hover spring animation) */}
            <button
              type="button"
              onClick={() => {
                setActiveView('browse');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="group relative overflow-hidden mt-3.5 sm:mt-8 inline-flex items-center gap-2.5 sm:gap-3.5 glass-cta-button text-neutral-900 rounded-full pl-5 sm:pl-7 pr-1.5 sm:pr-2 py-1.5 sm:py-2.5 text-[13px] sm:text-[14px] font-semibold transition-transform duration-200 ease-out hover:scale-[1.04] hover:-translate-y-0.5 active:scale-95 cursor-pointer select-none"
            >
              {/* Animated Glass Light Sheen */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
                <div className="absolute inset-0 -top-1 -bottom-1 w-1/2 bg-gradient-to-r from-transparent via-white/75 to-transparent animate-glass-sheen opacity-60 group-hover:opacity-100" />
              </div>

              <span className="relative z-10 tracking-tight text-neutral-900 group-hover:text-black">
                Get Started
              </span>

              <span className="relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#ef4d23] text-white flex items-center justify-center shadow-xs transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:shadow-[0_0_14px_rgba(239,77,35,0.65)]">
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200" />
              </span>
            </button>
          </div>

          {/* Dashboard Preview Tray */}
          <div className="w-full shrink-0 pointer-events-auto px-2 sm:px-4 pb-5 sm:pb-8">
            <div className="relative glass-card-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 w-full max-w-[880px] mx-auto text-neutral-900">
              
              {/* Subtle animated glass sheen effect */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl sm:rounded-3xl">
                <div className="absolute inset-0 -top-8 -bottom-8 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-glass-sheen opacity-50" />
              </div>

              {/* Mobile Tab Segment Switcher (visible on mobile only) */}
              <div className="flex sm:hidden items-center justify-between bg-black/5 p-1 rounded-full mb-2.5 text-xs border border-white/60">
                <button
                  type="button"
                  onClick={() => setMobileTab('savings')}
                  className={`flex-1 py-1 px-2 rounded-full text-center transition-all cursor-pointer text-[12px] ${
                    mobileTab === 'savings'
                      ? 'bg-[#0b0f1a] text-white font-semibold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 font-medium'
                  }`}
                >
                  ৳ Savings
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('matcher')}
                  className={`flex-1 py-1 px-2 rounded-full text-center transition-all cursor-pointer text-[12px] ${
                    mobileTab === 'matcher'
                      ? 'bg-[#0b0f1a] text-white font-semibold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 font-medium'
                  }`}
                >
                  🔍 Matcher
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('escrow')}
                  className={`flex-1 py-1 px-2 rounded-full text-center transition-all cursor-pointer text-[12px] ${
                    mobileTab === 'escrow'
                      ? 'bg-[#0b0f1a] text-white font-semibold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 font-medium'
                  }`}
                >
                  🛡️ Escrow
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                
                {/* Card 1 — Student Book Savings & Trades */}
                <div className={`glass-card-white-inner rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xs flex-col justify-between ${mobileTab === 'savings' ? 'flex' : 'hidden sm:flex'}`}>
                  <div>
                    <div className="flex items-center justify-between text-[13px] font-semibold">
                      <span className="text-[#ef4d23]">
                        {savingsToggle === 'savings' ? 'Student Savings' : 'Books Circulated'}
                      </span>
                      <span className="text-neutral-500 font-medium">This Semester</span>
                    </div>

                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-[26px] sm:text-[28px] font-bold text-neutral-900 tracking-tight">
                        {savingsToggle === 'savings' ? '৳14,850' : '436 Books'}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                        <TrendingDown className="w-3 h-3 shrink-0" />
                        <span>{savingsToggle === 'savings' ? '-65% vs Nilkhet' : '+128 this wk'}</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                      {savingsToggle === 'savings'
                        ? 'Saved by polytechnic diploma students'
                        : 'Active textbook exchanges on campus'}
                    </p>

                    <div className="text-center text-xs font-semibold text-neutral-600 mt-3 sm:mt-4 mb-1">
                      Semester Target Achieved
                    </div>

                    {/* Gauge 92% */}
                    <div className="w-full max-w-[220px] sm:max-w-[260px] mx-auto flex flex-col">
                      <GaugeSvg
                        value={savingsToggle === 'savings' ? 92 : 86}
                        color="#ef4d23"
                        inactiveColor="#e5e5e5"
                        textColor="#0f172a"
                      />
                      <div className="flex justify-between items-center text-[11px] text-neutral-500 px-3 -mt-1 font-semibold">
                        <span>{savingsToggle === 'savings' ? '৳8.5K' : '200'}</span>
                        <span>{savingsToggle === 'savings' ? '৳15K' : '500'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle pill */}
                  <div className="glass-pill-white rounded-full p-1 flex mt-3 sm:mt-4 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setSavingsToggle('savings')}
                      className={`flex-1 py-1 px-2.5 rounded-full text-center transition-all cursor-pointer ${
                        savingsToggle === 'savings'
                          ? 'bg-white text-neutral-900 shadow-xs font-bold'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      Total Savings
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavingsToggle('books')}
                      className={`flex-1 py-1 px-2.5 rounded-full text-center transition-all cursor-pointer ${
                        savingsToggle === 'books'
                          ? 'bg-white text-neutral-900 shadow-xs font-bold'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      Exchanged
                    </button>
                  </div>
                </div>

                {/* Card 2 — Quick Syllabus Textbook Finder Form */}
                <div className={`glass-card-white-inner rounded-xl sm:rounded-2xl p-3.5 sm:p-5 flex-col gap-2 sm:gap-3 shadow-xs relative ${mobileTab === 'matcher' ? 'flex' : 'hidden sm:flex'}`}>
                  {savedBanner && (
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[11px] px-2 py-0.5 rounded-md font-semibold animate-in fade-in shadow-xs">
                      Filtered!
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[13px] font-semibold mb-0.5">
                    <span className="text-[#ef4d23]">Book Matcher</span>
                    <span className="text-neutral-500 font-medium">BTEB Syllabus</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-neutral-700 font-semibold">Technology / Dept</label>
                    <div className="relative">
                      <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="w-full appearance-none border border-neutral-200/90 bg-white/95 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-neutral-800 hover:border-neutral-400 transition-colors cursor-pointer outline-none pr-8 font-medium shadow-xs"
                      >
                        <option value="Computer Technology">Computer Technology (666xx)</option>
                        <option value="Civil Technology">Civil Technology (670xx)</option>
                        <option value="Electrical Technology">Electrical Technology (667xx)</option>
                        <option value="Mechanical Technology">Mechanical Technology (668xx)</option>
                        <option value="Electronics Technology">Electronics Technology (668xx)</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-neutral-700 font-semibold">Target Semester</label>
                    <div className="relative">
                      <select
                        value={filterSemester}
                        onChange={(e) => setFilterSemester(e.target.value)}
                        className="w-full appearance-none border border-neutral-200/90 bg-white/95 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-neutral-800 hover:border-neutral-400 transition-colors cursor-pointer outline-none pr-8 font-medium shadow-xs"
                      >
                        <option value="All Semesters">All Semesters</option>
                        <option value="1st - 2nd Semester">1st - 2nd Semester</option>
                        <option value="3rd - 4th Semester">3rd - 4th Semester</option>
                        <option value="5th - 6th Semester">5th - 6th Semester</option>
                        <option value="7th - 8th Semester">7th - 8th Semester</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-neutral-700 font-semibold">Subject Code / Title</label>
                    <div className="relative flex items-center border border-neutral-200/90 bg-white/95 rounded-lg px-3 py-1 focus-within:border-neutral-400 transition-colors shadow-xs">
                      <span className="text-neutral-400 text-xs mr-1.5 font-mono select-none">#</span>
                      <input
                        type="text"
                        value={filterCode}
                        onChange={(e) => setFilterCode(e.target.value)}
                        placeholder="e.g. 66641 / Data Structure"
                        className="w-full text-xs sm:text-sm text-neutral-900 bg-transparent outline-none font-medium placeholder:text-neutral-400"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-neutral-700 font-semibold">Max Budget (৳)</label>
                    <div className="relative flex items-center border border-neutral-200/90 bg-white/95 rounded-lg px-3 py-1 focus-within:border-neutral-400 transition-colors shadow-xs">
                      <span className="text-neutral-400 text-xs mr-1.5 font-mono select-none">৳</span>
                      <input
                        type="number"
                        value={targetBudget}
                        onChange={(e) => setTargetBudget(e.target.value)}
                        className="w-full text-xs sm:text-sm text-neutral-900 bg-transparent outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1.5 sm:pt-2 mt-auto">
                    <button
                      type="button"
                      onClick={handleSaveForm}
                      className="bg-[#ef4d23] hover:bg-[#de3d13] text-white rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      Find Books
                    </button>
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="text-xs sm:text-sm text-neutral-500 hover:text-neutral-900 underline cursor-pointer font-medium"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleResetForm}
                      aria-label="Close form"
                      className="ml-auto text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card 3 — Campus Pickup Stations & PIN Escrow */}
                <div className={`glass-card-white-inner rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xs flex-col justify-between ${mobileTab === 'escrow' ? 'flex' : 'hidden sm:flex'}`}>
                  <div>
                    <div className="flex items-center justify-between text-[13px] font-semibold">
                      <span className="text-[#ef4d23]">Campus Handover</span>
                      <span className="text-neutral-500 font-medium">Zero-Scam Escrow</span>
                    </div>

                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-[26px] sm:text-[28px] font-bold text-neutral-900 tracking-tight">
                        {handoverToggle === 'booths' ? '99.4%' : '100%'}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                        <TrendingUp className="w-3 h-3 shrink-0" />
                        <span>PIN Verified</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                      {handoverToggle === 'booths'
                        ? 'Zero fraud across 6 campus pickup booths'
                        : 'Department library reception desk handovers'}
                    </p>

                    <div className="text-center text-xs font-semibold text-neutral-600 mt-3 sm:mt-4 mb-1">
                      Safe Handover Rate
                    </div>

                    {/* Gauge 98% */}
                    <div className="w-full max-w-[220px] sm:max-w-[260px] mx-auto flex flex-col">
                      <GaugeSvg
                        value={98}
                        color="#10b981"
                        inactiveColor="#e5e5e5"
                        textColor="#0f172a"
                      />
                      <div className="flex justify-between items-center text-[11px] text-neutral-500 px-3 -mt-1 font-semibold">
                        <span>Verified</span>
                        <span>Guaranteed</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle pill */}
                  <div className="glass-pill-white rounded-full p-1 flex mt-3 sm:mt-4 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setHandoverToggle('booths')}
                      className={`flex-1 py-1 px-2.5 rounded-full text-center transition-all cursor-pointer ${
                        handoverToggle === 'booths'
                          ? 'bg-white text-neutral-900 shadow-xs font-bold'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      Campus Booths
                    </button>
                    <button
                      type="button"
                      onClick={() => setHandoverToggle('library')}
                      className={`flex-1 py-1 px-2.5 rounded-full text-center transition-all cursor-pointer ${
                        handoverToggle === 'library'
                          ? 'bg-white text-neutral-900 shadow-xs font-bold'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      Library Desks
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Main Marketplace Sections below Hero */}
      <div className="mt-8 sm:mt-12 md:mt-14 space-y-8 sm:space-y-14 pb-12 px-2 sm:px-4 max-w-7xl mx-auto">
        
        {/* Department Quick Filter Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0b0f1a] tracking-tight">
                Explore by Technology / Department
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500">
                Browse textbooks categorized by Polytechnic syllabus
              </p>
            </div>
            <button
              onClick={() => {
                setActiveView('browse');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs sm:text-sm font-semibold text-[#ef4d23] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>All Technologies</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {departments.map((dept) => (
              <button
                key={dept.name}
                onClick={() => applyQuickSubjectSearch(dept.name)}
                className="p-3.5 rounded-2xl bg-white border border-[#e5e5e5] hover:border-[#ef4d23] text-left transition-all group shadow-xs hover:shadow-sm cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-mono font-semibold text-neutral-400 block mb-1">
                    {dept.code}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[#0b0f1a] group-hover:text-[#ef4d23] transition-colors leading-tight">
                    {dept.name.replace(' Technology', '')}
                  </p>
                </div>
                <span className="text-[11px] text-neutral-400 mt-2 block">
                  {dept.count}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Books Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#ef4d23]" />
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#0b0f1a] tracking-tight">
                  Recently Listed Books
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500">
                  Fresh listings from semester students on campus
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveView('browse');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs sm:text-sm font-semibold text-neutral-700 hover:text-[#ef4d23] flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>

        {/* High Savings / Student Budget Picks */}
        <section className="bg-white rounded-3xl p-5 sm:p-8 border border-[#e5e5e5] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#ef4d23]">
                Top Student Savings
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[#0b0f1a] tracking-tight mt-0.5">
                Maximum Value Book Deals
              </h2>
            </div>
            <button
              onClick={() => {
                setActiveView('browse');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs sm:text-sm font-semibold text-[#0b0f1a] hover:text-[#ef4d23] cursor-pointer"
            >
              Browse all deals →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {highSavingsBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>

        {/* Campus Pickup Points Information Card */}
        <section className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 shadow-xs">
          <div className="max-w-2xl mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ef4d23]">
              Zero-Scam Campus Safety
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#0b0f1a] tracking-tight mt-0.5">
              Official Polytechnic Pickup Stations
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Drop off your books with official department receptionists or collect with a secure PIN.
              No awkward street meetups.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PICKUP_POINTS.map((point) => (
              <div
                key={point.id}
                className="p-4 rounded-2xl bg-[#f5f2ee]/70 border border-[#e5e5e5] space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#ef4d23] shadow-xs mb-2 border border-[#e5e5e5]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-xs sm:text-sm text-[#0b0f1a] leading-tight">
                    {point.name}
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                    {point.locationDetail}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#e5e5e5] text-[10px] text-neutral-500 font-mono">
                  {point.operatingHours}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

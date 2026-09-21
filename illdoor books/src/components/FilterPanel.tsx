import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { CONDITIONS, SEMESTERS } from '../data/mockData';
import { Button } from './common/Button';

interface FilterPanelProps {
  onCloseMobile?: () => void;
  isMobileDrawer?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  onCloseMobile,
  isMobileDrawer = false,
}) => {
  const { filters, setFilters, resetFilters, books } = useMarketplace();
  const [draftMax, setDraftMax] = React.useState(filters.maxPrice);
  const departments = React.useMemo(() => ['All Departments', ...Array.from(new Set(books.flatMap((book) =>
    book.curriculumEntries?.length ? book.curriculumEntries.map((entry) => entry.department) : [book.department]
  ).filter(Boolean))).sort()], [books]);

  React.useEffect(() => {
    setDraftMax(filters.maxPrice);
  }, [filters.maxPrice]);

  const handleDepartmentChange = (dept: string) => {
    setFilters((prev) => ({ ...prev, department: dept }));
  };

  const handleSemesterChange = (sem: string) => {
    setFilters((prev) => ({ ...prev, semester: sem }));
  };

  const handleConditionChange = (cond: string) => {
    setFilters((prev) => ({ ...prev, condition: cond }));
  };

  const handleAvailabilityChange = (avail: string) => {
    setFilters((prev) => ({ ...prev, availability: avail }));
  };

  const handleMaxPriceChange = (price: number) => {
    setFilters((prev) => ({ ...prev, maxPrice: price }));
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-[#e5e5e5] p-4 sm:p-5 space-y-5 ${
        isMobileDrawer ? 'h-full overflow-y-auto' : ''
      }`}
    >
      {/* Header with Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
        <div>
          <h3 className="font-semibold text-sm sm:text-base text-[#0b0f1a]">
            বই ফিল্টার করুন
          </h3>
          <p className="text-xs text-neutral-400">সিলেবাস ও অবস্থা অনুযায়ী বাছাই করুন</p>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-[#ef4d23] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>রিসেট</span>
        </button>
      </div>

      {/* Department Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          টেকনোলজি / বিভাগ
        </label>
        <select
          value={filters.department}
          onChange={(e) => handleDepartmentChange(e.target.value)}
          className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] cursor-pointer"
        >
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept === 'All Departments' ? 'সকল বিভাগ' : dept}
            </option>
          ))}
        </select>
      </div>

      {/* Semester Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          সেমিস্টার
        </label>
        <select
          value={filters.semester}
          onChange={(e) => handleSemesterChange(e.target.value)}
          className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] cursor-pointer"
        >
          {SEMESTERS.map((sem) => (
            <option key={sem} value={sem}>
              {sem === 'All Semesters' ? 'সব সেমিস্টার' : sem}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          বিষয় কোড
        </label>
        <input
          type="text"
          value={filters.subjectCode}
          onChange={(e) => setFilters((prev) => ({ ...prev, subjectCode: e.target.value }))}
          placeholder="যেমন: 28541"
          className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23]"
        />
      </div>

      {/* Condition Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          বইয়ের অবস্থা
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((cond) => {
            const isSelected = filters.condition === cond;
            const condLabels: Record<string, string> = {
              'All Conditions': 'সব অবস্থা',
              'Like New': 'নতুন মতো',
              'Good': 'ভালো',
              'Fair': 'মোটামুটি',
              'Poor': 'ব্যবহারযোগ্য',
            };
            return (
              <button
                key={cond}
                type="button"
                onClick={() => handleConditionChange(cond)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#0b0f1a] text-white border-[#0b0f1a]'
                    : 'bg-white text-neutral-600 border-[#e5e5e5] hover:bg-[#f5f2ee]'
                }`}
              >
                {condLabels[cond] || cond}
              </button>
            );
          })}
        </div>
      </div>

      {/* Availability Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          লিস্টিং প্রাপ্যতা
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: 'All', label: 'সব' },
            { value: 'Available', label: 'উপলব্ধ' },
            { value: 'Unavailable', label: 'অনুপলব্ধ' },
          ].map(({ value, label }) => {
            const isSelected = filters.availability === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleAvailabilityChange(value)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#ef4d23] text-white border-[#ef4d23]'
                    : 'bg-white text-neutral-600 border-[#e5e5e5] hover:bg-[#f5f2ee]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-2 pt-2 border-t border-[#e5e5e5]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-neutral-500">
            সর্বোচ্চ মূল্য
          </span>
          <span className="font-bold text-[#0b0f1a]">৳{draftMax}</span>
        </div>
        <input
          type="range"
          min={100}
          max={2000}
          step={50}
          value={draftMax}
          onChange={(e) => setDraftMax(Number(e.target.value))}
          onPointerUp={() => handleMaxPriceChange(draftMax)}
          onKeyUp={() => handleMaxPriceChange(draftMax)}
          className="w-full accent-[#ef4d23] cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-neutral-400">
          <span>৳১০০</span>
          <span>৳২,০০০</span>
        </div>
      </div>

      {isMobileDrawer && onCloseMobile && (
        <div className="pt-4 border-t border-[#e5e5e5]">
          <Button variant="dark" fullWidth onClick={onCloseMobile}>
            ফিল্টার প্রয়োগ করুন
          </Button>
        </div>
      )}
    </div>
  );
};

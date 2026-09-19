import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { CONDITIONS, DEPARTMENTS, SEMESTERS } from '../data/mockData';
import { Button } from './common/Button';

interface FilterPanelProps {
  onCloseMobile?: () => void;
  isMobileDrawer?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  onCloseMobile,
  isMobileDrawer = false,
}) => {
  const { filters, setFilters, resetFilters } = useMarketplace();
  const [draftMax, setDraftMax] = React.useState(filters.maxPrice);

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
            Filter Books
          </h3>
          <p className="text-xs text-neutral-400">Refine by curriculum & status</p>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-[#ef4d23] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Department Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Department
        </label>
        <select
          value={filters.department}
          onChange={(e) => handleDepartmentChange(e.target.value)}
          className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] cursor-pointer"
        >
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      {/* Semester Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Semester
        </label>
        <select
          value={filters.semester}
          onChange={(e) => handleSemesterChange(e.target.value)}
          className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] cursor-pointer"
        >
          {SEMESTERS.map((sem) => (
            <option key={sem} value={sem}>
              {sem}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Subject Code
        </label>
        <input
          type="text"
          value={filters.subjectCode}
          onChange={(e) => setFilters((prev) => ({ ...prev, subjectCode: e.target.value }))}
          placeholder="e.g. 28541"
          className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23]"
        />
      </div>

      {/* Condition Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Condition
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((cond) => {
            const isSelected = filters.condition === cond;
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
                {cond}
              </button>
            );
          })}
        </div>
      </div>

      {/* Availability Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Listing Availability
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {['All', 'Available', 'Reserved'].map((avail) => {
            const isSelected = filters.availability === avail;
            return (
              <button
                key={avail}
                type="button"
                onClick={() => handleAvailabilityChange(avail)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#ef4d23] text-white border-[#ef4d23]'
                    : 'bg-white text-neutral-600 border-[#e5e5e5] hover:bg-[#f5f2ee]'
                }`}
              >
                {avail}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-2 pt-2 border-t border-[#e5e5e5]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-neutral-500">
            Max Price
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
          <span>৳100</span>
          <span>৳2,000</span>
        </div>
      </div>

      {isMobileDrawer && onCloseMobile && (
        <div className="pt-4 border-t border-[#e5e5e5]">
          <Button variant="dark" fullWidth onClick={onCloseMobile}>
            Apply Filters
          </Button>
        </div>
      )}
    </div>
  );
};

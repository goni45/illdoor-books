import React, { useState } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';

interface SearchBarProps {
  autoFocus?: boolean;
  onSearchSubmit?: () => void;
  showQuickTags?: boolean;
  size?: 'default' | 'large';
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearchSubmit,
  showQuickTags = true,
  size = 'default',
}) => {
  const { searchQuery, setSearchQuery, setFilters, setActiveView, applyQuickSubjectSearch } =
    useMarketplace();
  const [localValue, setLocalValue] = useState(searchQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localValue);
    setFilters((prev) => ({ ...prev, search: localValue }));
    setActiveView('browse');
    if (onSearchSubmit) onSearchSubmit();
  };

  const handleClear = () => {
    setLocalValue('');
    setSearchQuery('');
    setFilters((prev) => ({ ...prev, search: '' }));
  };

  const quickTags = [
    { label: '66661 Microprocessor', query: '66661' },
    { label: '66662 Database', query: '66662' },
    { label: '67061 Structure', query: '67061' },
    { label: '66761 Electrical', query: '66761' },
    { label: '66851 Fluid Mech', query: '66851' },
    { label: '65931 Math-III', query: '65931' },
  ];

  const isLarge = size === 'large';

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-center bg-white border border-[#e5e5e5] rounded-full shadow-sm hover:border-neutral-300 focus-within:border-[#ef4d23] focus-within:ring-4 focus-within:ring-[#ef4d23]/10 transition-all ${
          isLarge ? 'p-1.5 sm:p-2' : 'p-1'
        }`}
      >
        <div className="pl-3 sm:pl-4 text-neutral-400 flex items-center justify-center shrink-0">
          <Search className={isLarge ? 'w-5 h-5 sm:w-6 sm:h-6 text-[#ef4d23]' : 'w-4 h-4 sm:w-5 sm:h-5 text-neutral-400'} />
        </div>

        <input
          id="marketplace-search-input"
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="Search by book name, author or subject code..."
          className="w-full bg-transparent px-3 py-2 text-sm sm:text-base text-[#0b0f1a] placeholder-neutral-400 focus:outline-none"
        />

        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 mr-1 shrink-0 cursor-pointer"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="submit"
          className="bg-[#0b0f1a] text-white hover:bg-[#ef4d23] px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span>Search</span>
          <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
        </button>
      </form>

      {showQuickTags && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap justify-center text-xs">
          <span className="text-neutral-500 font-medium mr-1">Popular Subject Codes:</span>
          {quickTags.map((tag) => (
            <button
              key={tag.query}
              type="button"
              onClick={() => {
                setLocalValue(tag.query);
                applyQuickSubjectSearch(tag.query);
              }}
              className="px-2.5 py-1 rounded-full bg-white border border-[#e5e5e5] text-neutral-600 hover:border-[#ef4d23] hover:text-[#ef4d23] hover:bg-[#f5f2ee] transition-colors cursor-pointer"
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

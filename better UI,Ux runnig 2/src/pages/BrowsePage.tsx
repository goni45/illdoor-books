import React, { useState } from 'react';
import { SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { SearchBar } from '../components/SearchBar';
import { FilterPanel } from '../components/FilterPanel';
import { BookCard } from '../components/BookCard';
import { EmptyState } from '../components/common/EmptyState';

export const BrowsePage: React.FC = () => {
  const { filteredBooks, filters, setFilters, resetFilters } = useMarketplace();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const activeFilterCount =
    (filters.department !== 'All Departments' ? 1 : 0) +
    (filters.semester !== 'All Semesters' ? 1 : 0) +
    (filters.condition !== 'All Conditions' ? 1 : 0) +
    (filters.availability !== 'All' ? 1 : 0) +
    (filters.maxPrice < 2000 ? 1 : 0) +
    (filters.search ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Top Search Area */}
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-4 sm:p-6 shadow-xs">
        <div className="max-w-2xl mx-auto text-center mb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0b0f1a] tracking-tight">
            Browse Polytechnic Textbooks
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Search by book title, author, subject name, or BTEB 5-digit subject code
          </p>
        </div>
        <SearchBar size="default" showQuickTags={true} />
      </div>

      {/* Main Browse Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Desktop Filters Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 sticky top-20">
          <FilterPanel />
        </aside>

        {/* Results Area */}
        <main className="lg:col-span-3 space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-[#e5e5e5] p-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#0b0f1a]">
                {filteredBooks.length}
              </span>
              <span className="text-xs text-neutral-500">
                {filteredBooks.length === 1 ? 'book found' : 'books found'}
              </span>

              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="ml-2 text-xs text-[#ef4d23] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Clear filters</span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {/* Mobile Filter Button */}
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f5f2ee] border border-[#e5e5e5] text-xs font-semibold text-[#0b0f1a] cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#ef4d23]" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#ef4d23] text-white text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Sorting Select */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 ml-auto sm:ml-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                <span className="hidden sm:inline">Sort:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      sortBy: e.target.value as any,
                    }))
                  }
                  className="bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-2.5 py-1 text-xs font-medium text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] cursor-pointer"
                >
                  <option value="recommended">Recommended (Deals first)</option>
                  <option value="newest">Newest Listed</option>
                  <option value="price_low">Lowest Price (৳)</option>
                  <option value="price_high">Highest Price (৳)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Book Cards Grid */}
          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {filteredBooks.map((book, i) => (
                <BookCard key={book.id} book={book} priority={i < 4} />
              ))}
            </div>
          ) : (
            <EmptyState
              type="search"
              title="No books found"
              description="Try changing your search keywords, clear active filters, or check a different subject code."
              actionText="Reset All Filters"
              onAction={resetFilters}
            />
          )}
        </main>
      </div>

      {/* Mobile Filters Drawer Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setMobileFilterOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#e5e5e5]">
              <h3 className="font-bold text-base text-[#0b0f1a]">Filters</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f5f2ee] flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterPanel
                isMobileDrawer={true}
                onCloseMobile={() => setMobileFilterOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

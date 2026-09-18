import React from 'react';
import { Bookmark, MapPin } from 'lucide-react';
import { BookListing } from '../types';
import { useMarketplace } from '../context/MarketplaceContext';
import { ConditionBadge } from './common/ConditionBadge';
import { StatusBadge } from './common/StatusBadge';
import { PriceDisplay } from './common/PriceDisplay';

interface BookCardProps {
  book: BookListing;
  priority?: boolean;
}

const BookCardImpl: React.FC<BookCardProps> = ({ book, priority = false }) => {
  const { navigateToBook, toggleWishlist, isWishlisted } = useMarketplace();
  const wishlisted = isWishlisted(book.id);

  return (
    <div
      id={`book-card-${book.id}`}
      onClick={() => navigateToBook(book.id)}
      className="group flex flex-col bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden transition-all duration-200 hover:border-neutral-400/80 hover:shadow-md cursor-pointer relative"
    >
      {/* Book Cover Image Area */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[4/3] bg-[#f5f2ee] overflow-hidden flex items-center justify-center">
        <img
          src={book.images[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'}
          alt={book.title}
          width={600}
          height={450}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-300"
        />

        {/* Wishlist Button */}
        <button
          id={`wishlist-btn-${book.id}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(book.id);
          }}
          title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs border border-[#e5e5e5] flex items-center justify-center text-neutral-600 hover:text-[#ef4d23] hover:bg-white transition-colors z-10 shadow-xs cursor-pointer"
        >
          <Bookmark
            className={`w-4 h-4 transition-transform active:scale-90 ${
              wishlisted ? 'fill-[#ef4d23] text-[#ef4d23]' : ''
            }`}
          />
        </button>

        {/* Pickup Location micro-pill */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 rounded-full truncate opacity-90">
          <MapPin className="w-3 h-3 shrink-0 text-[#ef4d23]" />
          <span className="truncate">{book.pickupPointName}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-3.5 sm:p-4 justify-between gap-2.5">
        <div>
          {/* Subject Code & Availability Status */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#0b0f1a]/5 text-[#0b0f1a] text-xs font-mono font-semibold tracking-tight border border-black/5">
              Code {book.subjectCode}
            </span>
            <StatusBadge status={book.availability} size="sm" />
          </div>

          {/* Book Title */}
          <h3 className="font-semibold text-sm sm:text-[15px] text-[#0b0f1a] line-clamp-2 leading-snug group-hover:text-[#ef4d23] transition-colors mb-1">
            {book.title}
          </h3>

          {/* Semester & Condition */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-neutral-500 mb-2">
            <span>{book.semester}</span>
            <span>•</span>
            <ConditionBadge condition={book.condition} size="sm" />
          </div>
        </div>

        {/* Price & Savings Display */}
        <div className="pt-2 border-t border-[#e5e5e5]/80 flex items-end justify-between gap-2">
          <PriceDisplay
            sellingPrice={book.sellingPrice}
            originalPrice={book.originalPrice}
            savings={book.savings}
            size="sm"
            layout="stacked"
          />

          <span className="text-[11px] font-medium text-neutral-500 bg-[#f5f2ee] px-2 py-1 rounded-full group-hover:bg-[#0b0f1a] group-hover:text-white transition-colors">
            View Details
          </span>
        </div>
      </div>
    </div>
  );
};

export const BookCard = React.memo(BookCardImpl);


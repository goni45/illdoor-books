import React from 'react';
import { Bookmark, MapPin, Crown, Sparkles, ShieldCheck } from 'lucide-react';
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
  const { navigateToBook, toggleWishlist, isWishlisted, setPrefillSellData, setActiveView, filters } = useMarketplace();
  const wishlisted = isWishlisted(book.id);
  const availableStock = book.availableStock ?? (book.offers ?? []).filter((offer) => offer.availability === 'Available').length;
  const visibleCurriculum = book.curriculumEntries?.find((entry) =>
    (filters.department === 'All Departments' || entry.department === filters.department) &&
    (filters.semester === 'All Semesters' || entry.semester === filters.semester)
  ) ?? book.curriculumEntries?.[0];

  const startSelling = (event: React.MouseEvent) => {
    event.stopPropagation();
    setPrefillSellData({
      id: book.id,
      title: book.title,
      subjectCode: book.subjectCode,
      department: visibleCurriculum?.department || book.department,
      semester: visibleCurriculum?.semester || book.semester,
    });
    setActiveView('sell');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAdminVIP = Boolean(book.isAdminListing || book.seller?.isAdmin);
  const isVerifiedStudent = !isAdminVIP && Boolean(book.seller?.isVerified || book.seller?.verificationStatus === 'approved');

  // Hierarchy styling determinants
  const cardBorderAndShadow = isAdminVIP
    ? 'border-2 border-amber-400 ring-1 ring-amber-300/40 shadow-md shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/20 hover:-translate-y-1 bg-gradient-to-b from-amber-50/25 via-white to-white'
    : isVerifiedStudent
    ? 'border border-emerald-200/90 shadow-xs hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 bg-white'
    : 'border border-[#e5e5e5] hover:border-neutral-400/80 hover:shadow-md bg-white';

  return (
    <div
      id={`book-card-${book.id}`}
      onClick={() => navigateToBook(book.id)}
      className={`group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer relative ${cardBorderAndShadow}`}
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

        {/* Hierarchy Badges (Top-Left Floating) */}
        {isAdminVIP ? (
          <div className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white text-[11px] font-bold shadow-md shadow-amber-600/30 border border-amber-300/40 select-none">
            <Crown className="w-3.5 h-3.5 text-amber-200 fill-amber-300 animate-pulse shrink-0" />
            <span className="tracking-tight drop-shadow-xs">👑 Admin VIP Verified</span>
            <Sparkles className="w-3 h-3 text-amber-200 shrink-0" />
          </div>
        ) : isVerifiedStudent ? (
          <div className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600/95 backdrop-blur-xs text-white text-[11px] font-semibold shadow-xs border border-emerald-400/30 select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
            <span className="tracking-tight">Verified Student</span>
          </div>
        ) : null}

        {/* Wishlist Button */}
        <button
          id={`wishlist-btn-${book.id}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(book.id);
          }}
          title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full backdrop-blur-xs flex items-center justify-center transition-colors z-10 shadow-xs cursor-pointer ${
            isAdminVIP
              ? 'bg-white/95 border border-amber-200 text-amber-800 hover:text-amber-950 hover:bg-white'
              : 'bg-white/90 border border-[#e5e5e5] text-neutral-600 hover:text-[#ef4d23] hover:bg-white'
          }`}
        >
          <Bookmark
            className={`w-4 h-4 transition-transform active:scale-90 ${
              wishlisted
                ? isAdminVIP
                  ? 'fill-amber-500 text-amber-500'
                  : 'fill-[#ef4d23] text-[#ef4d23]'
                : ''
            }`}
          />
        </button>

        {/* Pickup Location micro-pill */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 rounded-full truncate opacity-90">
          <MapPin className={`w-3 h-3 shrink-0 ${isAdminVIP ? 'text-amber-400' : 'text-[#ef4d23]'}`} />
          <span className="truncate">{availableStock > 0 ? book.pickupPointName : 'No seller offer yet'}</span>
        </div>
      </div>

      {/* Official Store Strip (for Admin VIP Cards) */}
      {isAdminVIP && (
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-gradient-to-r from-amber-100/95 via-amber-50 to-orange-100/80 border-b border-amber-200/80 text-amber-950 text-xs select-none">
          <div className="flex items-center gap-1.5 min-w-0 font-bold">
            <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0 fill-amber-400" />
            <span className="truncate tracking-tight text-amber-950">Official Campus Admin Store</span>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
            VIP
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-3.5 sm:p-4 justify-between gap-2.5">
        <div>
          {/* Subject Code & Availability Status */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold tracking-tight ${
                isAdminVIP
                  ? 'bg-amber-100/70 text-amber-900 border border-amber-300/50'
                  : 'bg-[#0b0f1a]/5 text-[#0b0f1a] border border-black/5'
              }`}
            >
              Code {book.subjectCode}
            </span>
            <StatusBadge status={availableStock > 0 ? 'Available' : 'Unavailable'} size="sm" />
          </div>

          <div className="mb-2">
            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${book.publication === 'Technical Publication' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
              {book.publication || 'Haque Publication'}
            </span>
          </div>

          {/* Book Title */}
          <h3
            className={`font-semibold text-sm sm:text-[15px] text-[#0b0f1a] line-clamp-2 leading-snug transition-colors mb-1 ${
              isAdminVIP ? 'group-hover:text-amber-700' : 'group-hover:text-[#ef4d23]'
            }`}
          >
            {book.title}
          </h3>

          {/* Semester & Condition */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-neutral-500 mb-2">
            <span>{visibleCurriculum?.department || book.department}</span>
            <span>•</span>
            <span>{visibleCurriculum?.semester || book.semester}</span>
            {availableStock > 0 && <><span>•</span><ConditionBadge condition={book.condition} size="sm" /></>}
          </div>

          {/* Dedicated Trust & Verification Assurance Strip */}
          {isAdminVIP ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-300/70 text-[11px] font-semibold text-amber-900 shadow-xs mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Instant Campus Handover • 100% Genuine BTEB Copy</span>
            </div>
          ) : isVerifiedStudent ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/80 border border-emerald-200/70 text-[11px] font-medium text-emerald-800 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Verified Student Seller • Campus Pickup</span>
            </div>
          ) : null}
        </div>

        {/* Price & Savings Display */}
        <div
          className={`pt-2 border-t flex items-end justify-between gap-2 ${
            isAdminVIP ? 'border-amber-200/80' : 'border-[#e5e5e5]/80'
          }`}
        >
          {availableStock > 0 ? <PriceDisplay
            sellingPrice={book.lowestPrice ?? book.sellingPrice}
            originalPrice={book.originalPrice}
            savings={book.savings}
            size="sm"
            layout="stacked"
          /> : <div><p className="text-sm font-bold text-neutral-700">Stock 0</p><p className="text-[11px] text-neutral-500">Unavailable</p></div>}

          {isAdminVIP ? (
            <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300/60 px-2.5 py-1 rounded-full group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-orange-500 group-hover:text-white group-hover:border-transparent transition-all shadow-xs">
              VIP Details
            </span>
          ) : availableStock === 0 ? (
            <button type="button" onClick={startSelling} className="text-[11px] font-semibold text-white bg-[#ef4d23] px-2.5 py-1.5 rounded-full hover:bg-[#d9431d] transition-colors">
              Sell this book
            </button>
          ) : (
            <span className="text-[11px] font-medium text-neutral-500 bg-[#f5f2ee] px-2 py-1 rounded-full group-hover:bg-[#0b0f1a] group-hover:text-white transition-colors">
              Stock {availableStock} • {book.sellerCount ?? 0} sellers
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const BookCard = React.memo(BookCardImpl);

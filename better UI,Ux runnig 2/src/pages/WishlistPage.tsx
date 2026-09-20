import React from 'react';
import { Bookmark, ArrowLeft } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { BookCard } from '../components/BookCard';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';

export const WishlistPage: React.FC = () => {
  const { wishlistIds, books, setActiveView } = useMarketplace();

  const wishlistedBooks = books.filter((b) => wishlistIds.includes(b.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#ef4d23]/10 text-[#ef4d23] flex items-center justify-center">
              <Bookmark className="w-4 h-4 fill-[#ef4d23]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#ef4d23]">
              Saved Academic Textbooks
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b0f1a] tracking-tight mt-1">
            My Wishlist ({wishlistedBooks.length})
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Books you have bookmarked for upcoming semesters or midterms
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveView('browse')}
        >
          Explore More Books
        </Button>
      </div>

      {wishlistedBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {wishlistedBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <EmptyState
          type="wishlist"
          title="You haven't saved any books yet"
          description="Browse books to find something you need for your technology courses."
          actionText="Browse Polytechnic Books"
          onAction={() => setActiveView('browse')}
        />
      )}
    </div>
  );
};

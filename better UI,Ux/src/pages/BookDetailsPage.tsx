import React, { useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  ShieldCheck,
  MapPin,
  Flag,
  Share2,
  Check,
  CheckCircle2,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { ImageGallery } from '../components/ImageGallery';
import { ConditionBadge } from '../components/common/ConditionBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriceDisplay } from '../components/common/PriceDisplay';
import { UserAvatar } from '../components/common/UserAvatar';
import { Button } from '../components/common/Button';
import { BookCard } from '../components/BookCard';
import { PICKUP_POINTS } from '../data/mockData';

export const BookDetailsPage: React.FC = () => {
  const {
    selectedBookId,
    books,
    setActiveView,
    createOrder,
    navigateToOrder,
    toggleWishlist,
    isWishlisted,
    currentUser,
    fileDispute,
    user,
    openAuthModal,
  } = useMarketplace();

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPickupId, setSelectedPickupId] = useState<string>(PICKUP_POINTS[0].id);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Incorrect Information');
  const [reportDetails, setReportDetails] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const book = books.find((b) => b.id === selectedBookId) || books[0];

  if (!book) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-[#e5e5e5]">
        <p className="text-neutral-500 mb-4">Book not found.</p>
        <Button variant="dark" onClick={() => setActiveView('browse')}>
          Back to Browse
        </Button>
      </div>
    );
  }

  const isOwner = currentUser.id === book.seller.id;
  const wishlisted = isWishlisted(book.id);

  // Related books from same department
  const relatedBooks = books
    .filter((b) => b.id !== book.id && (b.department === book.department || b.semester === book.semester))
    .slice(0, 3);

  const handleBuyNowClick = () => {
    if (!user) {
      openAuthModal('login', 'বইটি কিনতে প্রথমে লগইন করুন (Please log in to purchase this book)');
      return;
    }
    setSelectedPickupId(book.pickupPointId || PICKUP_POINTS[0].id);
    setCheckoutModalOpen(true);
  };

  const handleConfirmOrder = async () => {
    const orderId = await createOrder(book.id, selectedPickupId);
    setCheckoutModalOpen(false);
    if (orderId) {
      navigateToOrder(orderId);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    fileDispute(
      `REPORT-${book.subjectCode}`,
      book.title,
      reportReason,
      reportDetails || 'User reported potential listing discrepancy'
    );
    setReportModalOpen(false);
    setReportDetails('');
  };

  return (
    <div className="space-y-8">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveView('browse')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-[#0b0f1a] bg-white border border-[#e5e5e5] px-3.5 py-1.5 rounded-full shadow-2xs hover:bg-[#f5f2ee] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Browse</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-neutral-600 bg-white border border-[#e5e5e5] px-3 py-1.5 rounded-full hover:bg-[#f5f2ee] cursor-pointer"
            title="Copy listing share link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
          </button>

          <button
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-rose-600 bg-white border border-[#e5e5e5] px-3 py-1.5 rounded-full hover:bg-rose-50 cursor-pointer"
            title="Report this listing"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report</span>
          </button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Gallery (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#e5e5e5] p-4 sm:p-6 shadow-xs sticky top-20">
          <ImageGallery images={book.images} title={book.title} />

          {/* Verification Guarantee Banner */}
          <div className="mt-5 p-3.5 rounded-2xl bg-[#f5f2ee] border border-[#e5e5e5] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-600">
              <span className="font-bold text-[#0b0f1a] block mb-0.5">
                Polytechnic Escrow Protection
              </span>
              Your payment is held safely until you physically inspect and confirm
              the book at the campus pickup point.
            </div>
          </div>
        </div>

        {/* Right Column: Book Information & Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Title & Metadata Card */}
          <div className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 shadow-xs space-y-5">
            {/* Subject Code & Availability Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-[#0b0f1a] text-white text-xs font-mono font-bold">
                  BTEB Subject {book.subjectCode}
                </span>
                <span className="text-xs font-medium text-neutral-500 bg-[#f5f2ee] px-3 py-1 rounded-full">
                  {book.department}
                </span>
              </div>
              <StatusBadge status={book.availability} size="md" />
            </div>

            {/* Book Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0b0f1a] tracking-tight leading-tight">
                {book.title}
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                By <span className="font-semibold text-neutral-700">{book.author}</span>
                {book.edition && <span> • {book.edition}</span>}
              </p>
            </div>

            {/* Price Showcase Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f2ee] border border-[#e5e5e5] flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block mb-1">
                  Student Price
                </span>
                <PriceDisplay
                  sellingPrice={book.sellingPrice}
                  originalPrice={book.originalPrice}
                  savings={book.savings}
                  size="lg"
                  layout="stacked"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleWishlist(book.id)}
                  className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                    wishlisted
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-white border-[#e5e5e5] text-neutral-600 hover:text-[#ef4d23]'
                  }`}
                  title={wishlisted ? 'Saved in Wishlist' : 'Save to Wishlist'}
                >
                  <Bookmark
                    className={`w-5 h-5 ${wishlisted ? 'fill-rose-600 text-rose-600' : ''}`}
                  />
                </button>

                {/* Primary Buy Now CTA */}
                {isOwner ? (
                  <div className="px-5 py-2.5 rounded-full bg-neutral-200 text-neutral-700 text-xs font-semibold">
                    Your Own Listing
                  </div>
                ) : book.availability === 'Available' ? (
                  <button
                    id="book-buy-now-btn"
                    onClick={handleBuyNowClick}
                    className="bg-[#0b0f1a] hover:bg-[#ef4d23] text-white px-7 py-3 rounded-full text-sm sm:text-base font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <span>Buy Now (Escrow)</span>
                  </button>
                ) : (
                  <div className="px-5 py-2.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                    Currently {book.availability}
                  </div>
                )}
              </div>
            </div>

            {/* Academic Specs Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#e5e5e5]">
              <div className="p-2.5 rounded-xl bg-white border border-[#e5e5e5]">
                <span className="text-[11px] text-neutral-400 block">Semester</span>
                <span className="text-xs sm:text-sm font-semibold text-[#0b0f1a]">
                  {book.semester}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#e5e5e5]">
                <span className="text-[11px] text-neutral-400 block">Condition</span>
                <div className="mt-0.5">
                  <ConditionBadge condition={book.condition} size="sm" />
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#e5e5e5]">
                <span className="text-[11px] text-neutral-400 block">Curriculum</span>
                <span className="text-xs sm:text-sm font-semibold text-[#0b0f1a]">
                  BTEB Probidhan
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#e5e5e5]">
                <span className="text-[11px] text-neutral-400 block">ISBN</span>
                <span className="text-xs sm:text-sm font-mono font-medium text-neutral-700">
                  {book.isbn ? book.isbn.slice(0, 11) + '...' : 'Verified'}
                </span>
              </div>
            </div>

            {/* Condition Details */}
            <div className="space-y-1.5 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Condition Notes & Inspection
              </h3>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed bg-[#f5f2ee]/50 p-3.5 rounded-xl border border-[#e5e5e5]">
                {book.conditionDetails}
              </p>
            </div>

            {/* Campus Pickup Point Preview */}
            <div className="space-y-2 pt-2 border-t border-[#e5e5e5]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Designated Campus Pickup Station
              </h3>
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-[#e5e5e5]">
                <MapPin className="w-5 h-5 text-[#ef4d23] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-[#0b0f1a]">{book.pickupPointName}</p>
                  <p className="text-neutral-500 text-xs mt-0.5">
                    Safe department pickup booth with physical inspection and 4-digit PIN verification.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Student Seller Profile Summary Card */}
          <div className="bg-white rounded-3xl border border-[#e5e5e5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <UserAvatar
                src={book.seller.avatar}
                name={book.seller.name}
                size="lg"
                isVerified={book.seller.isVerified}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-[#0b0f1a]">
                    {book.seller.name}
                  </h3>
                  {book.seller.isVerified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.2 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {book.seller.institute} • {book.seller.department} ({book.seller.semester})
                </p>
                <div className="flex items-center gap-3 text-xs text-neutral-600 mt-1">
                  <span>⭐ {book.seller.rating} rating</span>
                  <span>•</span>
                  <span>📦 {book.seller.totalSales} books sold</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView('profile')}
            >
              View Student Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Related Books Section */}
      {relatedBooks.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-[#e5e5e5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#ef4d23]" />
              <h2 className="text-lg sm:text-xl font-bold text-[#0b0f1a]">
                More Books in {book.department}
              </h2>
            </div>
            <button
              onClick={() => setActiveView('browse')}
              className="text-xs sm:text-sm font-semibold text-[#ef4d23] hover:underline cursor-pointer"
            >
              See all
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {relatedBooks.map((relBook) => (
              <BookCard key={relBook.id} book={relBook} />
            ))}
          </div>
        </section>
      )}

      {/* Buy Now / Checkout Escrow Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <h3 className="text-lg font-bold text-[#0b0f1a]">
                Confirm Order & Campus Pickup
              </h3>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Order Summary Item */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#f5f2ee] border border-[#e5e5e5]">
              <img
                src={book.images[0]}
                alt={book.title}
                className="w-14 h-14 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm text-[#0b0f1a] truncate">
                  {book.title}
                </h4>
                <p className="text-xs text-neutral-500">
                  Subject {book.subjectCode} • {book.condition}
                </p>
                <p className="text-xs font-bold text-[#ef4d23] mt-0.5">
                  ৳{book.sellingPrice} (Save ৳{book.savings})
                </p>
              </div>
            </div>

            {/* Select Campus Pickup Point */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#ef4d23]" />
                <span>Choose Campus Pickup Station</span>
              </label>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {PICKUP_POINTS.map((pt) => {
                  const isSelected = selectedPickupId === pt.id;
                  return (
                    <div
                      key={pt.id}
                      onClick={() => setSelectedPickupId(pt.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#ef4d23] bg-[#ef4d23]/5 ring-1 ring-[#ef4d23]'
                          : 'border-[#e5e5e5] bg-white hover:bg-[#f5f2ee]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0b0f1a]">{pt.name}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#ef4d23]" />
                        )}
                      </div>
                      <p className="text-neutral-500 text-[11px] mt-0.5">
                        {pt.locationDetail}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Escrow Terms */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70 text-xs text-emerald-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Zero-Risk Escrow:</strong> Your payment of ৳{book.sellingPrice} is held securely. You will receive a 4-digit PIN to inspect and claim the book.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setCheckoutModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="dark"
                fullWidth
                onClick={handleConfirmOrder}
              >
                Confirm Order (৳{book.sellingPrice})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Listing Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleSubmitReport}
            className="bg-white rounded-3xl border border-[#e5e5e5] p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-[#0b0f1a] flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-600" />
              <span>Report Listing</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Report incorrect curriculum year, inaccurate condition, or abusive listing.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">
                Reason
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl p-2.5 text-xs text-[#0b0f1a]"
              >
                <option value="Incorrect Subject Code">Incorrect Subject Code</option>
                <option value="Inaccurate Condition Rating">Inaccurate Condition Rating</option>
                <option value="Fake or Missing Pages">Fake or Missing Pages</option>
                <option value="Unresponsive Seller">Unresponsive Seller</option>
                <option value="Other Policy Violation">Other Policy Violation</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">
                Additional Details
              </label>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Explain the problem for campus admin review..."
                className="w-full bg-white border border-[#e5e5e5] rounded-xl p-2.5 text-xs text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => setReportModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                fullWidth
                size="sm"
              >
                Submit Report
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

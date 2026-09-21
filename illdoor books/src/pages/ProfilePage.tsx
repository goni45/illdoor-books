import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Star,
  Package,
  ShoppingBag,
  PlusCircle,
  Trash2,
  Eye,
  CheckCircle2,
  Award,
  IdCard,
  LogOut,
  Clock,
  Loader2,
  UploadCloud,
  BadgeCheck,
  AlertCircle,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { UserAvatar } from '../components/common/UserAvatar';
import { Button } from '../components/common/Button';
import { PriceDisplay } from '../components/common/PriceDisplay';
import { StatusBadge } from '../components/common/StatusBadge';
import { ContactPreferencesPanel } from '../components/ContactPreferencesPanel';

export const ProfilePage: React.FC = () => {
  const {
    currentUser,
    books,
    deleteBookListing,
    updateBookStatus,
    navigateToBook,
    setActiveView,
    user,
    openAuthModal,
    signOut,
    reviews,
    verificationRequest,
    submitVerificationRequest,
    isAdmin,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'listings' | 'reviews' | 'verify'>('listings');
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [btebRollInput, setBtebRollInput] = useState(currentUser.rollNumber || '');
  const [btebRegInput, setBtebRegInput] = useState(currentUser.registrationNo || '');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // My listings
  const myListings = books.flatMap((book) => (book.offers ?? []).filter((o) => o.seller.id === currentUser.id).map((o) => ({ ...book, listingId: o.id, seller: o.seller, condition: o.condition, conditionDetails: o.conditionDetails, originalPrice: o.originalPrice, sellingPrice: o.sellingPrice, savings: o.savings, availability: o.availability, pickupPointId: o.pickupPointId, pickupPointName: o.pickupPointName })));

  const verificationPending = verificationRequest?.status === 'pending';
  const verificationRejected = verificationRequest?.status === 'rejected';

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyFeedback(null);

    if (!btebRollInput.trim()) {
      setVerifyFeedback({ type: 'error', message: 'বিটিইবি বোর্ড রোল নম্বর প্রদান আবশ্যক।' });
      return;
    }
    if (!idCardFile && !verificationRequest?.idCardPath) {
      setVerifyFeedback({ type: 'error', message: 'অনুগ্রহ করে শিক্ষার্থী আইডি কার্ডের ছবি যুক্ত করুন।' });
      return;
    }

    setVerifySubmitting(true);
    const result = await submitVerificationRequest({
      studentRoll: btebRollInput,
      studentRegNo: btebRegInput,
      idCardFile,
    });
    setVerifySubmitting(false);
    setVerifyFeedback({ type: result.success ? 'success' : 'error', message: result.message });

    if (result.success) {
      setIdCardFile(null);
      setTimeout(() => setVerifyModalOpen(false), 1800);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-8 max-w-lg mx-auto text-center space-y-4 my-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#ef4d23]/10 text-[#ef4d23] flex items-center justify-center mx-auto">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0b0f1a]">প্রোফাইল দেখতে লগইন করুন</h2>
        <p className="text-sm text-neutral-500">
          আপনার প্রোফাইল, তালিকাভুক্ত বই এবং রিভিউ দেখতে আপনার অ্যাকাউন্টে লগইন করুন।
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="primary" onClick={() => openAuthModal('login', 'প্রোফাইল দেখতে লগইন করুন')}>
            লগইন করুন
          </Button>
          <Button variant="outline" onClick={() => setActiveView('browse')}>
            বই ব্রাউজ করুন
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <UserAvatar
              src={currentUser.avatar}
              name={currentUser.name}
              size="xl"
              isVerified={currentUser.isVerified}
            />

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0b0f1a] tracking-tight">
                  {currentUser.name}
                </h1>
                {currentUser.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>যাচাইকৃত শিক্ষার্থী</span>
                  </span>
                ) : verificationPending ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full">
                    <Clock className="w-3.5 h-3.5" />
                    <span>ভেরিফিকেশন অপেক্ষমাণ</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setVerifyModalOpen(true)}
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full cursor-pointer border ${
                      verificationRejected
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {verificationRejected ? 'ভেরিফিকেশন বাতিল — পুনরায় জমা দিন' : 'শিক্ষার্থী আইডি যাচাই'}
                  </button>
                )}
              </div>

              <p className="text-xs sm:text-sm text-neutral-600 flex items-center gap-1.5 flex-wrap">
                <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-semibold text-[#0b0f1a]">{currentUser.institute}</span>
                <span>•</span>
                <span>{currentUser.department}</span>
                <span>•</span>
                <span className="font-mono text-[#ef4d23] font-semibold">{currentUser.semester}</span>
                {currentUser.session && (
                  <>
                    <span>•</span>
                    <span className="bg-[#ef4d23]/10 text-[#ef4d23] px-1.5 py-0.5 rounded text-[11px] font-semibold font-mono">
                      সেশন {currentUser.session}
                    </span>
                  </>
                )}
              </p>

              <div className="flex items-center gap-4 text-xs text-neutral-400 pt-1">
                <span>রোল: {currentUser.rollNumber || 'নির্ধারিত নয়'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> যুক্ত হয়েছেন: {currentUser.joinedDate}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {(isAdmin || currentUser.isAdmin) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveView('admin')}
                icon={<ShieldCheck className="w-4 h-4 text-[#ef4d23]" />}
                className="bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100 font-semibold"
              >
                অ্যাডমিন কনসোল
              </Button>
            )}
            <Button
              variant="dark"
              size="sm"
              onClick={() => setActiveView('sell')}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              বই বিক্রি করুন
            </Button>
            {!currentUser.isVerified && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVerifyModalOpen(true)}
              >
                আইডি যাচাই
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                setActiveView('home');
              }}
              icon={<LogOut className="w-4 h-4 text-red-500" />}
              className="text-red-600 hover:bg-red-50 border-red-200"
            >
              লগআউট
            </Button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-[#e5e5e5]">
          <div className="p-3.5 rounded-2xl bg-[#f5f2ee] border border-[#e5e5e5]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
              সক্রিয় লিস্টিং
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-[#0b0f1a]">
                {myListings.length}
              </span>
              <span className="text-xs text-neutral-400">টি বই</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f5f2ee] border border-[#e5e5e5]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
              মোট বিক্রিত বই
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-[#0b0f1a]">
                {currentUser.totalSales}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">হস্তান্তরিত</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f5f2ee] border border-[#e5e5e5]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
              মোট ক্রীত বই
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-[#0b0f1a]">
                {currentUser.totalPurchases}
              </span>
              <span className="text-xs text-sky-600 font-semibold">সংগৃহীত</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f5f2ee] border border-[#e5e5e5]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
              শিক্ষার্থী রেটিং
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-[#0b0f1a]">
                {currentUser.rating}
              </span>
              <span className="text-xs text-amber-500 font-bold">★ / 5.0</span>
            </div>
          </div>
        </div>
      </div>

      <ContactPreferencesPanel />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e5e5e5] pb-1">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'listings'
              ? 'border-[#ef4d23] text-[#ef4d23]'
              : 'border-transparent text-neutral-500 hover:text-[#0b0f1a]'
          }`}
        >
          আমার বই লিস্টিং ({myListings.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'reviews'
              ? 'border-[#ef4d23] text-[#ef4d23]'
              : 'border-transparent text-neutral-500 hover:text-[#0b0f1a]'
          }`}
        >
          সহপাঠীদের রিভিউ ({reviews.length})
        </button>
      </div>

      {/* Tab: My Listed Books */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {myListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myListings.map((book) => (
                <div
                  key={book.id}
                  className="bg-white rounded-2xl border border-[#e5e5e5] p-4 flex gap-4 items-center justify-between shadow-xs hover:border-neutral-300 transition-all"
                >
                  <img
                    src={book.images[0]}
                    alt={book.title}
                    className="w-16 h-20 rounded-xl object-cover shrink-0 border border-[#e5e5e5]"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-[#0b0f1a]">
                        কোড {book.subjectCode}
                      </span>
                      <StatusBadge status={book.availability} size="sm" />
                    </div>
                    <h3 className="font-bold text-sm text-[#0b0f1a] truncate">
                      {book.title}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {book.semester} • {book.condition}
                    </p>
                    <div className="mt-1">
                      <PriceDisplay
                        sellingPrice={book.sellingPrice}
                        originalPrice={book.originalPrice}
                        savings={book.savings}
                        size="sm"
                        layout="horizontal"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => navigateToBook(book.id)}
                      className="p-2 rounded-full bg-[#f5f2ee] hover:bg-neutral-200 text-neutral-700 text-xs font-semibold flex items-center justify-center cursor-pointer"
                      title="বইয়ের বিস্তারিত দেখুন"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <select
                      value={book.availability}
                      onChange={(event) => {
                        void updateBookStatus(book.listingId ?? book.id, event.target.value as typeof book.availability)
                          .catch((error) => alert(error instanceof Error ? error.message : 'লিস্টিং আপডেট করা সম্ভব হয়নি।'));
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-neutral-100 border text-neutral-700 cursor-pointer"
                      aria-label="লিস্টিং অবস্থা"
                    >
                      <option value="Available">উপলব্ধ</option>
                      <option value="Reserved">সংরক্ষিত</option>
                      <option value="Sold">বিক্রি হয়েছে</option>
                      <option value="Inactive">স্থগিত</option>
                    </select>
                    <button
                      onClick={() => {
                        if (window.confirm('এই লিস্টিংটি স্থায়ীভাবে মুছে ফেলতে চান?')) {
                          void deleteBookListing(book.listingId ?? book.id).catch((error) =>
                            alert(error instanceof Error ? error.message : 'লিস্টিং মুছে ফেলা যায়নি।')
                          );
                        }
                      }}
                      className="p-2 rounded-full hover:bg-rose-50 text-neutral-400 hover:text-rose-600 text-xs flex items-center justify-center cursor-pointer"
                      title="লিস্টিং মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#e5e5e5] space-y-3">
              <p className="text-neutral-500 text-sm">
                আপনি এখনো বিক্রির জন্য কোনো বই লিস্টিং করেননি।
              </p>
              <Button variant="dark" onClick={() => setActiveView('sell')}>
                আপনার প্রথম বই লিস্টিং করুন
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Reviews (real reviews received from completed transactions) */}
      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e5e5e5] p-8 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-[#0b0f1a]">এখনো কোনো রিভিউ নেই</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                রিভিউগুলো আগের যাচাইকৃত অর্ডার ইতিহাস থেকে দেখানো হয়। নতুন সরাসরি যোগাযোগের লেনদেনে স্বয়ংক্রিয় রিভিউ চালু নেই।
              </p>
            </div>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-2xl border border-[#e5e5e5] p-5 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#0b0f1a]">
                      {rev.reviewerName}
                    </h4>
                    <p className="text-xs text-neutral-400">
                      {rev.reviewerDepartment}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{Number(rev.rating).toFixed(1)}</span>
                  </div>
                </div>

                {rev.comment && (
                  <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                    "{rev.comment}"
                  </p>
                )}

                <div className="pt-1 flex items-center justify-between gap-2 flex-wrap text-[11px] text-neutral-400 font-mono">
                  <span className="truncate">বই: {rev.bookTitle}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {rev.isVerifiedTransaction && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="w-3 h-3" />
                        যাচাইকৃত লেনদেন
                      </span>
                    )}
                    <span>{rev.date}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* BTEB Student Verification Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleVerifySubmit}
            className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <h3 className="text-base font-bold text-[#0b0f1a] flex items-center gap-2">
                <IdCard className="w-5 h-5 text-[#ef4d23]" />
                <span>কারিগরি (BTEB) শিক্ষার্থী আইডি ভেরিফিকেশন</span>
              </h3>
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              আপনার বিটিইবি বোর্ড রোল, রেজিস্ট্রেশন নম্বর এবং স্টুডেন্ট আইডি কার্ডের ছবি জমা দিন। ক্যাম্পাস ডেস্ক অ্যাডমিন তা যাচাই করে অনুমোদন দিলে 'যাচাইকৃত শিক্ষার্থী' ব্যাজ যুক্ত হবে।
            </p>

            {verificationRequest && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  verificationRequest.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : verificationRequest.status === 'pending'
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {verificationRequest.status === 'approved' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : verificationRequest.status === 'pending' ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>
                    {verificationRequest.status === 'approved'
                      ? 'ক্যাম্পাস ডেস্ক কর্তৃক অনুমোদিত'
                      : verificationRequest.status === 'pending'
                        ? 'ক্যাম্পাস ডেস্কের পর্যালোচনার অপেক্ষায়'
                        : 'বাতিল করা হয়েছে — তথ্য সংশোধন করে পুনরায় জমা দিন'}
                  </span>
                </div>
                {verificationRequest.adminNote && (
                  <p className="pl-6 opacity-90">অ্যাডমিনের মন্তব্য: {verificationRequest.adminNote}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600">
                পলিটেকনিক ইনস্টিটিউট
              </label>
              <input
                type="text"
                disabled
                value={currentUser.institute}
                className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-3 py-2 text-xs text-neutral-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600">
                বিটিইবি বোর্ড রোল নম্বর
              </label>
              <input
                type="text"
                value={btebRollInput}
                onChange={(e) => setBtebRollInput(e.target.value)}
                placeholder="যেমন: 542109"
                className="w-full bg-white border border-[#e5e5e5] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600">
                রেজিস্ট্রেশন নম্বর
              </label>
              <input
                type="text"
                value={btebRegInput}
                onChange={(e) => setBtebRegInput(e.target.value)}
                placeholder="যেমন: 1502089412"
                className="w-full bg-white border border-[#e5e5e5] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600">
                শিক্ষার্থী আইডি কার্ডের ছবি
              </label>
              <label className="flex items-center gap-3 bg-[#f5f2ee] border border-dashed border-[#d6d0c8] rounded-xl px-3 py-3 cursor-pointer hover:border-[#ef4d23] transition-colors">
                <UploadCloud className="w-5 h-5 text-[#ef4d23] shrink-0" />
                <span className="text-xs text-neutral-600 leading-tight">
                  {idCardFile
                    ? idCardFile.name
                    : verificationRequest?.idCardPath
                      ? 'একটি ছবি পূর্বেই জমা রয়েছে — পরিবর্তন করতে নতুন ছবি নির্বাচন করুন'
                      : 'আইডি কার্ডের স্পষ্ট ছবি যুক্ত করুন (ক্যামেরা বা ফাইল)'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setIdCardFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {verifyFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  verifyFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {verifyFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span>{verifyFeedback.message}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => setVerifyModalOpen(false)}
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                variant="dark"
                fullWidth
                size="sm"
                disabled={verifySubmitting}
                icon={verifySubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {verifySubmitting
                  ? 'জমা হচ্ছে…'
                  : verificationRequest
                    ? 'পুনরায় পর্যালোচনার জন্য জমা দিন'
                    : 'পর্যালোচনার জন্য জমা দিন'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

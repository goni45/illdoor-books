import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Check, CheckCircle2, MapPin, Share2, ShieldCheck } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { ConditionBadge } from '../components/common/ConditionBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { Button } from '../components/common/Button';
import { ContactSellerModal } from '../components/ContactSellerModal';
import type { SellerListing } from '../types';
import { getPublicationCover } from '../lib/publicationEditions';

export const BookDetailsPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const {
    selectedBookId, books, setActiveView,
    toggleWishlist, isWishlisted, user, openAuthModal, setPrefillSellData,
  } = useMarketplace();

  const targetId = bookId || selectedBookId;
  const book = books.find((b) => b.id === targetId);
  const [offer, setOffer] = useState<SellerListing | null>(null);
  const [copied, setCopied] = useState(false);
  const offers = useMemo(() => (book?.offers ?? []).filter((o) => o.availability === 'Available').sort((a, b) => a.sellingPrice - b.sellingPrice), [book]);

  if (!book) {
    return (
      <div className="p-10 bg-white rounded-3xl text-center space-y-4 max-w-md mx-auto my-12 border border-neutral-200">
        <p className="text-neutral-700 font-medium">বইয়ের তথ্য পাওয়া যায়নি (Book not found)।</p>
        <Button onClick={() => navigate('/books')}>বই খুঁজুন (Browse Books)</Button>
      </div>
    );
  }

  const choose = (o: SellerListing) => {
    if (!user) return openAuthModal('login', 'বিক্রেতার সাথে যোগাযোগ করতে লগইন করুন।');
    setOffer(o);
  };

  const startSelling = () => {
    setPrefillSellData({
      id: book.id,
      title: book.title,
      subjectCode: book.subjectCode,
      department: book.department,
      semester: book.semester,
    });
    setActiveView('sell');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const share = () => {
    navigator.clipboard?.writeText(`${location.origin}/books/${encodeURIComponent(book.id)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/books')} className="inline-flex gap-2 items-center text-sm font-semibold cursor-pointer text-neutral-700 hover:text-[#ef4d23]">
          <ArrowLeft className="w-4" />ফিরে যান
        </button>
        <div className="flex gap-2">
          <button onClick={() => toggleWishlist(book.id)} className="p-2 rounded-full border bg-white cursor-pointer hover:border-neutral-300">

            <Bookmark className={`w-4 ${isWishlisted(book.id) ? 'fill-[#ef4d23] text-[#ef4d23]' : 'text-neutral-600'}`} />
          </button>
          <button onClick={share} className="p-2 rounded-full border bg-white cursor-pointer hover:border-neutral-300">
            {copied ? <Check className="w-4 text-emerald-600" /> : <Share2 className="w-4 text-neutral-600" />}
          </button>
        </div>
      </div>

      <section className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-3xl border p-5">
          <img src={book.images[0]} alt={book.title} className="w-full aspect-[4/3] object-contain rounded-2xl bg-[#f5f2ee]" />
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 text-xs text-emerald-800 flex gap-2">
            <ShieldCheck className="w-4 shrink-0 text-emerald-600" />
            <span>সিলেক্ট করা প্রকাশনী অনুযায়ী নির্দিষ্ট প্রচ্ছদ দেখানো হয়।</span>
          </div>
        </div>
        <div className="lg:col-span-7 bg-white rounded-3xl border p-6 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <span className="bg-[#0b0f1a] text-white rounded-full px-3 py-1 text-xs font-mono">BTEB {book.subjectCode}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold border ${book.publication === 'Technical Publication' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
              {book.publication || 'হক পাবলিকেশন'}
            </span>
            {(book.curriculumEntries?.length ? book.curriculumEntries : [{ id: 'legacy', bookId: book.id, regulation: book.regulation || '2022', technologyCode: '', department: book.department, semester: book.semester }]).map((entry) => (
              <span key={`${entry.technologyCode}-${entry.semester}`} className="bg-[#f5f2ee] rounded-full px-3 py-1 text-xs">
                {entry.department} • {entry.semester}
              </span>
            ))}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0b0f1a]">{book.title}</h1>
            <p className="text-neutral-500 mt-1">লেখক: {book.author}{book.edition ? ` • ${book.edition}` : ''}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#f5f2ee]"><span className="text-xs text-neutral-500">শুরুর মূল্য</span><p className="text-xl font-bold">{offers.length ? `৳${offers[0].sellingPrice}` : 'কোনো অফার নেই'}</p></div>
            <div className="p-4 rounded-2xl bg-[#f5f2ee]"><span className="text-xs text-neutral-500">উপলব্ধ কপি</span><p className="text-xl font-bold">{offers.length}</p></div>
            <div className="p-4 rounded-2xl bg-[#f5f2ee]"><span className="text-xs text-neutral-500">বিক্রেতা</span><p className="text-xl font-bold">{new Set(offers.map((item) => item.seller.id)).size}</p></div>
          </div>
          <p className="text-sm text-neutral-600">নির্দিষ্ট কপি, সংগ্রহের স্থান ও মূল্য তুলনা করে বিক্রেতার সাথে সরাসরি যোগাযোগ করুন।</p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-[#0b0f1a]">উপলব্ধ বিক্রেতাদের অফার</h2>
          <p className="text-sm text-neutral-500">প্রতিটি কার্ডে একজন শিক্ষার্থীর ব্যবহৃত নির্দিষ্ট কপির বিবরণ ও পিকআপ অপশন দেওয়া আছে।</p>
        </div>
        {offers.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center space-y-3">
            <p className="font-semibold text-neutral-800">অনুপলব্ধ • স্টক ০</p>
            <p className="text-sm text-neutral-500">এখনো কোনো বিক্রেতা যুক্ত হননি। প্রথম শিক্ষার্থী হিসেবে এই বইটি বিক্রি করতে পারেন।</p>
            <Button onClick={startSelling}>এই বইটি বিক্রি করুন</Button>
          </div>
        ) : (
          offers.map((o) => (
            <article key={o.id} className="bg-white rounded-2xl border p-5 grid md:grid-cols-[1fr_auto] gap-4">
              <div className="flex gap-3">
                <img src={getPublicationCover(book, o.publication)} alt={`${book.title} — ${o.publication}`} className="w-14 h-20 object-cover rounded-lg border bg-[#f5f2ee] shrink-0" />
                <UserAvatar src={o.seller.avatar} name={o.seller.name} isVerified={o.seller.isVerified} />
                <div className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <h3 className="font-bold text-[#0b0f1a]">{o.seller.name}</h3>
                    {o.seller.isVerified && <CheckCircle2 className="w-4 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-neutral-500">{o.seller.department} • ⭐ {o.seller.rating}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ConditionBadge condition={o.condition} />
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${o.publication === 'Technical Publication' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                      {o.publication}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 mt-2">{o.conditionDetails || 'অতিরিক্ত কোনো বিবরণ নেই।'}</p>

                  {o.pickupType === 'seller_place' ? (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-[#ef4d23] shrink-0" />
                      <span>পিকআপ: সেলারের স্থান / বাসা ({o.sellerPlaceAddress || 'সেলার নির্ধারিত স্থান'})</span>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
                      <MapPin className="w-3 text-[#ef4d23] shrink-0" />
                      <span>{o.pickupPointName}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="md:text-right flex md:flex-col items-center md:items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold text-[#0b0f1a]">৳{o.sellingPrice}</p>
                  {o.originalPrice > o.sellingPrice && (
                    <p className="text-xs text-neutral-400 line-through">৳{o.originalPrice}</p>
                  )}
                </div>
                <Button onClick={() => choose(o)} disabled={o.seller.id === user?.id}>
                  {o.seller.id === user?.id ? 'আপনার নিজের লিস্টিং' : 'বিক্রেতার সাথে যোগাযোগ'}
                </Button>
              </div>
            </article>
          ))
        )}
      </section>

      {offer && (
        <ContactSellerModal
          open
          onClose={() => setOffer(null)}
          seller={offer.seller}
          title={book.title}
          subtitle={`${offer.publication} • ${offer.condition} • ৳${offer.sellingPrice}`}
          pickupText={offer.pickupType === 'seller_place' ? (offer.sellerPlaceAddress || 'সেলার নির্ধারিত স্থান') : offer.pickupPointName}
          listingId={offer.id}
          bookId={book.id}
          defaultMessage={`আসসালামু আলাইকুম, Illdoor-এ আপনার “${book.title}” বইটি দেখেছি। বইটি কি এখনো পাওয়া যাবে?`}
        />
      )}
    </div>
  );
};


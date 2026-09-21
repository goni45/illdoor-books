import React, { useState } from 'react';
import { ArrowLeft, Layers3, MapPin, ShieldCheck, X } from 'lucide-react';
import { ContactSellerModal } from '../components/ContactSellerModal';
import { Button } from '../components/common/Button';
import { ConditionBadge } from '../components/common/ConditionBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { useMarketplace } from '../context/MarketplaceContext';
import { useSemesterBundles } from '../hooks/useSemesterBundles';
import type { SemesterBundle, SemesterBundleItem } from '../types';

export const SemesterBundlesPage: React.FC = () => {
  const { setActiveView, user, openAuthModal } = useMarketplace();
  const { bundles, loading, error, setBundleStatus } = useSemesterBundles();
  const [selected, setSelected] = useState<SemesterBundle | null>(null);
  // undefined = details, null = whole bundle contact, item = item contact
  const [contactItem, setContactItem] = useState<SemesterBundleItem | null | undefined>(undefined);

  const visibleBundles = bundles.filter((bundle) => bundle.availability === 'Available' || bundle.seller.id === user?.id);

  const openContact = (bundle: SemesterBundle, item: SemesterBundleItem | null) => {
    if (!user) return openAuthModal('login', 'বিক্রেতার সাথে যোগাযোগ করতে লগইন করুন।');
    setSelected(bundle);
    setContactItem(item);
  };

  return <div className="space-y-6">
    <button onClick={() => setActiveView('home')} className="inline-flex gap-2 items-center text-sm font-semibold cursor-pointer"><ArrowLeft className="w-4" />হোমে ফিরে যান</button>
    <header className="bg-white rounded-3xl border p-6 sm:p-8">
      <span className="text-xs font-bold text-[#ef4d23] uppercase">একই ডিপার্টমেন্ট • একই ইনস্টিটিউট</span>
      <h1 className="text-2xl sm:text-3xl font-bold mt-1">সম্পূর্ণ সেমিস্টার বুক বান্ডেল</h1>
      <p className="text-sm text-neutral-500 mt-2">সেটের বইগুলো দেখুন, বিক্রেতার তথ্য মিলিয়ে সরাসরি যোগাযোগ করুন এবং সংগ্রহ ও মূল্য পরিশোধ নিজেদের মধ্যে ঠিক করুন।</p>
    </header>

    {loading ? <div className="p-10 text-center">সেমিস্টার বান্ডেল লোড হচ্ছে…</div>
      : error ? <div className="p-6 rounded-2xl bg-amber-50 text-amber-800">ডাটাবেজ সমস্যা: {error}</div>
      : visibleBundles.length === 0 ? <div className="bg-white rounded-3xl border p-10 text-center"><Layers3 className="mx-auto text-neutral-300 w-12 h-12" /><h2 className="font-bold mt-3">আপনার ইনস্টিটিউট থেকে এখনো কোনো সেমিস্টার বান্ডেল যুক্ত হয়নি</h2></div>
      : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{visibleBundles.map((bundle) => <article key={bundle.id} className="bg-white rounded-3xl border overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-orange-50 to-white border-b">
          <div className="flex justify-between gap-2"><span className="px-3 py-1 rounded-full bg-[#0b0f1a] text-white text-xs font-bold">সম্পূর্ণ সেমিস্টার সেট</span><span className="text-xs font-semibold">{bundle.availability}</span></div>
          <h2 className="text-xl font-bold mt-4">{bundle.semester}</h2><p className="text-sm text-neutral-500">{bundle.department}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3"><UserAvatar src={bundle.seller.avatar} name={bundle.seller.name} isVerified={bundle.seller.isVerified} /><div><b>{bundle.seller.name}</b><p className="text-xs text-neutral-500">{bundle.seller.institute}</p></div></div>
          <div className="grid grid-cols-2 gap-2"><div className="p-3 rounded-xl bg-[#f5f2ee]"><small>বই সংখ্যা</small><p className="font-bold">{bundle.items.length}টি</p></div><div className="p-3 rounded-xl bg-[#f5f2ee]"><small>ফুল-সেট মূল্য</small><p className="font-bold">৳{bundle.sellingPrice}</p></div></div>
          <p className="text-xs flex items-center gap-1 text-neutral-600"><MapPin className="w-3.5 text-[#ef4d23]" />{bundle.pickupPointName}</p>
          {bundle.seller.id === user?.id && <select value={bundle.availability} onChange={(event) => void setBundleStatus(bundle.id, event.target.value as SemesterBundle['availability']).catch((reason) => alert(reason instanceof Error ? reason.message : 'বান্ডেল আপডেট করা যায়নি।'))} className="w-full p-2.5 rounded-xl border text-xs font-semibold"><option value="Available">উপলব্ধ</option><option value="Reserved">সংরক্ষিত</option><option value="Sold">বিক্রি হয়েছে</option><option value="Inactive">স্থগিত</option></select>}
          <Button className="w-full" onClick={() => { setSelected(bundle); setContactItem(undefined); }}>সম্পূর্ণ সেট দেখুন</Button>
        </div>
      </article>)}</div>}

    {selected && contactItem === undefined && <div className="fixed inset-0 z-40 bg-black/60 p-4 flex items-center justify-center"><div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
      <header className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between gap-3"><h2 className="text-2xl font-bold">{selected.semester} • {selected.items.length}টি বই</h2><button onClick={() => setSelected(null)} className="p-2 cursor-pointer"><X /></button></header>
      <div className="p-6 space-y-5">
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3"><ShieldCheck className="text-amber-700 shrink-0" /><div><b>Illdoor অর্ডার বা পেমেন্ট নেয় না</b><p className="text-sm text-amber-800">বই দেখে তারপর সরাসরি মূল্য পরিশোধ করুন; আগাম টাকা পাঠাবেন না।</p></div></div>
        <p className="p-3.5 rounded-2xl bg-neutral-50 border text-xs"><b>প্রস্তাবিত সংগ্রহের স্থান:</b> {selected.pickupPointName}</p>
        <div className="space-y-2">{selected.items.map((item) => <div key={item.id} className="p-3 rounded-2xl border grid grid-cols-[52px_1fr_auto] gap-3 items-center"><img src={item.book.images[0]} alt={item.book.title} className="w-12 h-16 rounded-lg object-cover bg-neutral-100" /><div><b className="text-sm">{item.book.subjectCode} — {item.book.title}</b><div className="flex gap-2 mt-1 flex-wrap"><ConditionBadge condition={item.condition} size="sm" /><span className="text-[11px]">{item.publication}</span></div></div><button disabled={selected.seller.id === user?.id || selected.availability !== 'Available'} onClick={() => openContact(selected, item)} className="text-xs font-semibold text-[#ef4d23] disabled:text-neutral-300 cursor-pointer">এই বইটি সম্পর্কে জিজ্ঞেস করুন</button></div>)}</div>
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-center border-t pt-5"><b className="text-3xl">৳{selected.sellingPrice}</b><Button onClick={() => openContact(selected, null)} disabled={selected.seller.id === user?.id || selected.availability !== 'Available'}>{selected.seller.id === user?.id ? 'আপনার নিজের বান্ডেল' : 'সম্পূর্ণ সেট সম্পর্কে যোগাযোগ'}</Button></div>
      </div>
    </div></div>}

    {selected && contactItem !== undefined && <ContactSellerModal open onClose={() => setContactItem(undefined)} seller={selected.seller} title={contactItem ? contactItem.book.title : `${selected.semester} সম্পূর্ণ সেমিস্টার সেট`} subtitle={contactItem ? `${contactItem.publication} • ${contactItem.condition}` : `${selected.items.length}টি বই • ৳${selected.sellingPrice}`} pickupText={selected.pickupPointName} bundleId={selected.id} bookId={contactItem?.bookId} defaultMessage={contactItem ? `আসসালামু আলাইকুম, Illdoor-এ আপনার ${selected.semester} বান্ডেলের “${contactItem.book.title}” বইটি দেখেছি। এটি কি আলাদাভাবে পাওয়া যাবে?` : `আসসালামু আলাইকুম, Illdoor-এ আপনার ${selected.semester} সম্পূর্ণ বইয়ের সেটটি দেখেছি। সেটটি কি এখনো পাওয়া যাবে?`} />}
  </div>;
};

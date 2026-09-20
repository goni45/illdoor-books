import React, { useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Layers3, MapPin, ShieldCheck, X } from 'lucide-react';
import { Button } from '../components/common/Button';
import { ConditionBadge } from '../components/common/ConditionBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { useMarketplace } from '../context/MarketplaceContext';
import { useSemesterBundles } from '../hooks/useSemesterBundles';
import type { SemesterBundle } from '../types';

export const SemesterBundlesPage: React.FC = () => {
  const { setActiveView, navigateToOrder, user, openAuthModal } = useMarketplace();
  const { bundles, singleBookRequests, loading, error, buyBundle, requestSingleBook, respondToSingleBookRequest } = useSemesterBundles();
  const [selected, setSelected] = useState<SemesterBundle | null>(null);
  const [requestBookId, setRequestBookId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [responseRequestId, setResponseRequestId] = useState<string | null>(null);
  const [responseOriginalPrice, setResponseOriginalPrice] = useState(500);
  const [responseSellingPrice, setResponseSellingPrice] = useState(300);

  const available = bundles.filter((bundle) => bundle.availability === 'Available' || bundle.seller.id === user?.id);
  const checkout = async (bundle: SemesterBundle) => {
    if (!user) return openAuthModal('login', 'Full semester bundle কিনতে লগইন করুন।');
    setBusy(true); setFeedback('');
    const result = await buyBundle(bundle.id);
    setBusy(false);
    if (result.error) return setFeedback(result.error);
    setSelected(null);
    navigateToOrder(result.orderId);
  };
  const submitRequest = async () => {
    if (!selected || !requestBookId) return;
    if (!user) return openAuthModal('login', 'Seller-এর কাছে request পাঠাতে লগইন করুন।');
    setBusy(true);
    const result = await requestSingleBook(selected.id, requestBookId, requestMessage);
    setBusy(false); setFeedback(result.message);
    if (result.success) { setRequestBookId(null); setRequestMessage(''); }
  };

  const respond = async (decision: 'accepted' | 'rejected') => {
    if (!responseRequestId) return;
    setBusy(true);
    const result = await respondToSingleBookRequest(responseRequestId, decision, responseOriginalPrice, responseSellingPrice);
    setBusy(false); setFeedback(result.message);
    if (result.success) setResponseRequestId(null);
  };

  return <div className="space-y-6">
    <button onClick={() => setActiveView('home')} className="inline-flex gap-2 items-center text-sm font-semibold"><ArrowLeft className="w-4" />Home</button>
    <header className="bg-white rounded-3xl border p-6 sm:p-8">
      <span className="text-xs font-bold text-[#ef4d23] uppercase">Same department • Same institute</span>
      <h1 className="text-2xl sm:text-3xl font-bold mt-1">Complete Semester Book Sets</h1>
      <p className="text-sm text-neutral-500 mt-2">প্রতিটি card একটি সম্পূর্ণ semester set। একটি বই সরাসরি কেনা যাবে না।</p>
    </header>
    {loading ? <div className="p-10 text-center">Loading semester bundles…</div> : error ? <div className="p-6 rounded-2xl bg-amber-50 text-amber-800">Database migration required: {error}</div> : available.length === 0 ?
      <div className="bg-white rounded-3xl border p-10 text-center"><Layers3 className="mx-auto text-neutral-300 w-12 h-12" /><h2 className="font-bold mt-3">No semester bundles from your institute yet</h2><p className="text-sm text-neutral-500">আপনার department-এর catalog থাকবে, কিন্তু bundle শুধু same-institute seller publish করলে দেখাবে।</p></div> :
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{available.map((bundle) => <article key={bundle.id} className="bg-white rounded-3xl border overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-orange-50 to-white border-b"><div className="flex justify-between gap-2"><span className="px-3 py-1 rounded-full bg-[#0b0f1a] text-white text-xs font-bold">FULL SEMESTER ONLY</span><span className="text-xs font-semibold">{bundle.availability}</span></div><h2 className="text-xl font-bold mt-4">{bundle.semester}</h2><p className="text-sm text-neutral-500">{bundle.department}</p></div>
        <div className="p-5 space-y-4"><div className="flex items-center gap-3"><UserAvatar src={bundle.seller.avatar} name={bundle.seller.name} isVerified={bundle.seller.isVerified} /><div><b>{bundle.seller.name}</b><p className="text-xs text-neutral-500">{bundle.seller.institute}</p></div></div><div className="grid grid-cols-2 gap-2"><div className="p-3 rounded-xl bg-[#f5f2ee]"><span className="text-xs text-neutral-500">Books</span><p className="font-bold">{bundle.items.length}</p></div><div className="p-3 rounded-xl bg-[#f5f2ee]"><span className="text-xs text-neutral-500">Full-set price</span><p className="font-bold">৳{bundle.sellingPrice}</p></div></div><p className="text-xs flex gap-1 text-neutral-500"><MapPin className="w-3" />{bundle.pickupPointName}</p><Button className="w-full" onClick={() => { setSelected(bundle); setFeedback(''); }}>View full set</Button></div>
      </article>)}</div>}

    {selected && <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center"><div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
      <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between gap-3"><div><span className="text-xs font-bold text-[#ef4d23]">FULL SEMESTER BUNDLE</span><h2 className="text-2xl font-bold">{selected.semester} • {selected.items.length} books</h2></div><button onClick={() => setSelected(null)} className="p-2"><X /></button></div>
      <div className="p-6 space-y-5"><div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3"><ShieldCheck className="text-amber-700 shrink-0" /><div><b>একটি বই সরাসরি কেনা যাবে না</b><p className="text-sm text-amber-800">Proceed করতে পুরো semester set কিনুন অথবা নিচে seller-এর কাছে নির্দিষ্ট বইটি আলাদাভাবে চেয়ে request পাঠান।</p></div></div>
        <div className="space-y-2">{selected.items.map((item) => <div key={item.id} className="p-3 rounded-2xl border grid grid-cols-[52px_1fr_auto] gap-3 items-center"><img src={item.book.images[0]} alt="" className="w-12 h-16 rounded-lg object-cover bg-neutral-100" /><div><b className="text-sm">{item.book.subjectCode} — {item.book.title}</b><div className="flex gap-2 mt-1 flex-wrap"><ConditionBadge condition={item.condition} size="sm" /><span className="text-[11px] px-2 py-1 rounded-full bg-sky-50 text-sky-700">{item.publication}</span></div>{item.conditionDetails && <p className="text-xs text-neutral-500 mt-1">{item.conditionDetails}</p>}</div><button disabled={selected.seller.id === user?.id} onClick={() => { setRequestBookId(item.bookId); setFeedback(''); }} className="text-xs font-semibold text-[#ef4d23] disabled:text-neutral-300">Ask separately</button></div>)}</div>
        {requestBookId && <div className="p-4 rounded-2xl bg-[#f5f2ee] space-y-3"><h3 className="font-bold flex gap-2"><BookOpen className="w-4" />Request this book separately</h3><textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} maxLength={500} placeholder="Optional message to seller" className="w-full p-3 rounded-xl border" /><div className="flex gap-2"><Button onClick={submitRequest} disabled={busy}>{busy ? 'Sending…' : 'Send request'}</Button><Button variant="outline" onClick={() => setRequestBookId(null)}>Cancel</Button></div></div>}
        {selected.seller.id === user?.id && singleBookRequests.filter((request) => request.bundleId === selected.id && request.status === 'pending').length > 0 && <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-3"><h3 className="font-bold">Buyer single-book requests</h3>{singleBookRequests.filter((request) => request.bundleId === selected.id && request.status === 'pending').map((request) => { const item = selected.items.find((entry) => entry.bookId === request.bookId); return <div key={request.id} className="bg-white rounded-xl p-3 border"><b className="text-sm">{item?.book.title || 'Bundle book'}</b>{request.message && <p className="text-xs text-neutral-500 mt-1">“{request.message}”</p>}<div className="flex gap-2 mt-2"><Button size="sm" onClick={() => setResponseRequestId(request.id)}>Accept & separate</Button><Button size="sm" variant="outline" onClick={async () => { setBusy(true); const result = await respondToSingleBookRequest(request.id, 'rejected'); setFeedback(result.message); setBusy(false); }}>Reject</Button></div></div>; })}{responseRequestId && <div className="p-3 rounded-xl bg-white border space-y-2"><p className="text-xs font-semibold">Accepting creates an individual listing and makes this full-set bundle inactive.</p><div className="grid grid-cols-2 gap-2"><input type="number" min={1} value={responseOriginalPrice} onChange={(e) => setResponseOriginalPrice(Number(e.target.value))} className="p-2 rounded-lg border" placeholder="Original price"/><input type="number" min={1} value={responseSellingPrice} onChange={(e) => setResponseSellingPrice(Number(e.target.value))} className="p-2 rounded-lg border" placeholder="Selling price"/></div><div className="flex gap-2"><Button size="sm" onClick={() => respond('accepted')} disabled={busy}>Confirm separate listing</Button><Button size="sm" variant="outline" onClick={() => setResponseRequestId(null)}>Cancel</Button></div></div>}</div>}
        {feedback && <p className="p-3 rounded-xl bg-orange-50 text-sm">{feedback}</p>}
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-center border-t pt-5"><div><p className="text-xs text-neutral-500 line-through">৳{selected.originalPrice}</p><p className="text-3xl font-bold">৳{selected.sellingPrice}</p></div><Button onClick={() => checkout(selected)} disabled={busy || selected.seller.id === user?.id || selected.availability !== 'Available'}>{selected.seller.id === user?.id ? 'Your bundle' : busy ? 'Placing order…' : 'Buy full semester set'}</Button></div>
      </div>
    </div></div>}
  </div>;
};

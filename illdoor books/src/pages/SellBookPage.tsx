import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Home, Layers3, MapPin, Search, ShoppingBag, Ban } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { useSemesterBundles, type BundleDraft } from '../hooks/useSemesterBundles';
import type { BookListing, Condition, PickupType, Publication } from '../types';
import { CONDITIONS, DEPARTMENTS } from '../data/mockData';
import { Button } from '../components/common/Button';
import { getPublicationCover } from '../lib/publicationEditions';

const PUBLICATIONS: Publication[] = ['Haque Publication', 'Technical Publication'];
const normalize = (value: string) => value.trim().toLowerCase();

type BundleItemDraft = {
  book: BookListing;
  publication: Publication;
  condition: Condition;
  conditionDetails: string;
};
type SemesterDraft = { originalPrice: number; sellingPrice: number; items: BundleItemDraft[] };

export const SellBookPage: React.FC = () => {
  const {
    books, addBookListing, navigateToBook, user, currentUser, openAuthModal,
    setActiveView, pickupPoints, prefillSellData, setPrefillSellData,
  } = useMarketplace();
  const { createBundleBatch } = useSemesterBundles();
  const [mode, setMode] = useState<'single' | 'semester'>('single');
  const [query, setQuery] = useState('');
  const [modelId, setModelId] = useState('');
  const [selectedDept, setSelectedDept] = useState(currentUser.department || 'Computer Science & Technology');
  const [condition, setCondition] = useState<Condition>('Good');
  const [publication, setPublication] = useState<Publication>('Haque Publication');
  const [details, setDetails] = useState('');
  const [originalPrice, setOriginalPrice] = useState(650);
  const [sellingPrice, setSellingPrice] = useState(350);
  const [pickupId, setPickupId] = useState(pickupPoints[0]?.id || '');
  const [pickupType, setPickupType] = useState<PickupType>('campus_spot');
  const [sellerPlaceAddress, setSellerPlaceAddress] = useState('');
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([]);
  const [semesterDrafts, setSemesterDrafts] = useState<Record<string, SemesterDraft>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ type: 'single' | 'semester'; id?: string; count?: number } | null>(null);

  const department = selectedDept;

  useEffect(() => {
    if (currentUser.department) {
      setSelectedDept(currentUser.department);
    }
  }, [currentUser.department]);
  const departmentBooks = useMemo(() => books.filter((book) =>
    (book.curriculumEntries ?? []).some((entry) => normalize(entry.department) === normalize(department)) ||
    normalize(book.department) === normalize(department)), [books, department]);
  const semesters = useMemo(() => Array.from(new Set(departmentBooks.flatMap((book) =>
    (book.curriculumEntries ?? []).filter((entry) => normalize(entry.department) === normalize(department)).map((entry) => entry.semester)
      .concat(normalize(book.department) === normalize(department) ? [book.semester] : []),
  ))).filter(Boolean).sort((a, b) => Number(a) - Number(b)), [departmentBooks, department]);
  const matches = useMemo(() => {
    const q = normalize(query);
    return departmentBooks.filter((book) => !q || [book.title, book.subjectCode, book.subjectName].some((value) => normalize(value).includes(q)));
  }, [departmentBooks, query]);
  const selected = books.find((book) => book.id === modelId);

  useEffect(() => { if (!pickupId && pickupPoints[0]) setPickupId(pickupPoints[0].id); }, [pickupId, pickupPoints]);
  useEffect(() => {
    if (!prefillSellData || books.length === 0) return;

    if (prefillSellData.mode === 'semester' || prefillSellData.subjectCode === 'FULL SET') {
      setMode('semester');
      if (prefillSellData.semester) {
        const targetSem = prefillSellData.semester;
        setSelectedSemesters([targetSem]);
        setSemesterDrafts((current) => {
          if (current[targetSem]) return current;
          const items = booksForSemester(targetSem).map((book) => ({
            book,
            publication: book.publication || 'Haque Publication',
            condition: 'Good' as Condition,
            conditionDetails: '',
          }));
          return {
            ...current,
            [targetSem]: {
              originalPrice: Math.max(1, items.length * 500),
              sellingPrice: prefillSellData.sellingPrice || Math.max(1, items.length * 300),
              items,
            },
          };
        });
      }
      setPrefillSellData(null);
      return;
    }

    const target = books.find((book) => book.id === prefillSellData.id || (prefillSellData.subjectCode && book.subjectCode === prefillSellData.subjectCode));
    if (!target) return;
    setMode('single');
    setModelId(target.id);
    setPublication(target.publication || 'Haque Publication');
    if (prefillSellData.sellingPrice) setSellingPrice(prefillSellData.sellingPrice);
    setPrefillSellData(null);
  }, [books, prefillSellData, setPrefillSellData, departmentBooks]);

  const booksForSemester = (semester: string) => departmentBooks.filter((book) =>
    (book.curriculumEntries ?? []).some((entry) => normalize(entry.department) === normalize(department) && entry.semester === semester) ||
    (normalize(book.department) === normalize(department) && book.semester === semester));

  const toggleSemester = (semester: string) => {
    setSelectedSemesters((current) => current.includes(semester) ? current.filter((item) => item !== semester) : [...current, semester]);
    setSemesterDrafts((current) => {
      if (current[semester]) return current;
      const items = booksForSemester(semester).map((book) => ({
        book, publication: book.publication || 'Haque Publication', condition: 'Good' as Condition, conditionDetails: '',
      }));
      return { ...current, [semester]: { originalPrice: Math.max(1, items.length * 500), sellingPrice: Math.max(1, items.length * 300), items } };
    });
  };

  const updateSemester = (semester: string, patch: Partial<SemesterDraft>) => setSemesterDrafts((current) => ({
    ...current, [semester]: { ...current[semester], ...patch },
  }));
  const updateBundleItem = (semester: string, bookId: string, patch: Partial<BundleItemDraft>) => {
    const draft = semesterDrafts[semester];
    if (!draft) return;
    updateSemester(semester, { items: draft.items.map((item) => item.book.id === bookId ? { ...item, ...patch } : item) });
  };

  if (!user) return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl border p-8 text-center space-y-4">
      <BookOpen className="mx-auto text-[#ef4d23]" /><h2 className="text-xl font-bold">বই বিক্রি করতে লগইন করুন</h2>
      <Button onClick={() => openAuthModal('login', 'বই বিক্রি করতে লগইন করুন')}>লগইন করুন</Button>
    </div>
  );
  if (done) return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl border p-10 text-center space-y-4">
      <CheckCircle2 className="mx-auto w-12 h-12 text-emerald-600" />
      <h2 className="text-2xl font-bold">{done.type === 'single' ? 'বইয়ের লিস্টিং প্রকাশিত হয়েছে' : `${done.count}টি সেমিস্টার বান্ডেল প্রকাশিত হয়েছে`}</h2>
      <p>{done.type === 'single' ? 'আপনার বইটি এখন বিক্রির জন্য সক্রিয়।' : 'প্রতিটি সেমিস্টার আলাদা ফুল-সেট বান্ডেল হিসেবে প্রকাশ হয়েছে; আগ্রহী শিক্ষার্থীরা যোগাযোগ করতে পারবে।'}</p>
      <Button onClick={() => done.id ? navigateToBook(done.id) : setActiveView('semester-bundles')}>লিস্টিং দেখুন</Button>
    </div>
  );

  const submitSingle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (currentUser.isBanned) {
      return setError(`????? ???????????? ?????? ??? ?????? ????: ${currentUser.banReason || '?????????? ???? ??????? ????'}`);
    }
    if (!selected) return setError('অনুগ্রহ করে প্রথমে একটি বিটিইবি বিষয় নির্বাচন করুন।');
    if (sellingPrice <= 0 || originalPrice <= 0 || sellingPrice > originalPrice) return setError('বিক্রয় মূল্য অবশ্যই ধনাত্মক হতে হবে এবং মূল মূল্যের চেয়ে বেশি হতে পারবে না।');
    const isSellerPlace = pickupType === 'seller_place' || pickupId === 'seller_place';
    if (isSellerPlace && !sellerPlaceAddress.trim()) {
      return setError('অনুগ্রহ করে আপনার বাসা বা নির্ধারিত স্থান বা মেসের ঠিকানা লিখুন যাতে ক্রেতা বই রিসিভ করতে পারেন।');
    }
    setBusy(true); setError('');
    try {
      const chosenPickup = isSellerPlace ? undefined : pickupPoints.find((point) => point.id === pickupId);
      const id = await addBookListing({
        ...selected,
        bookModelId: selected.id,
        condition,
        publication,
        conditionDetails: details,
        originalPrice,
        sellingPrice,
        pickupType: isSellerPlace ? 'seller_place' : 'campus_spot',
        sellerPlaceAddress: isSellerPlace ? sellerPlaceAddress.trim() : undefined,
        pickupPointId: isSellerPlace ? 'seller_place' : (chosenPickup?.id || pickupPoints[0]?.id || 'pk-1'),
        pickupPointName: isSellerPlace
          ? (sellerPlaceAddress.trim() ? `সেলার স্থান: ${sellerPlaceAddress.trim()}` : 'বিক্রেতার স্থান / বাসা থেকে পিকআপ')
          : (chosenPickup?.name || 'ক্যাম্পাস পিকআপ পয়েন্ট'),
        availability: 'Available',
      } as never);
      setDone({ type: 'single', id });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'লিস্টিং প্রকাশ করা সম্ভব হয়নি।'); }
    finally { setBusy(false); }
  };

  const submitBundles = async (event: React.FormEvent) => {
    event.preventDefault();
    if (currentUser.isBanned) {
      return setError(`????? ???????????? ?????? ??? ?????? ????: ${currentUser.banReason || '?????????? ???? ??????? ????'}`);
    }
    if (!department) return setError('প্রথমে আপনার প্রোফাইলে বিভাগ বা টেকনোলজি পূরণ করুন।');
    if (selectedSemesters.length === 0) return setError('কমপক্ষে একটি সেমিস্টার নির্বাচন করুন।');
    const isSellerPlace = pickupType === 'seller_place' || pickupId === 'seller_place';
    if (isSellerPlace && !sellerPlaceAddress.trim()) {
      return setError('অনুগ্রহ করে আপনার বাসা বা নির্ধারিত স্থান বা মেসের ঠিকানা লিখুন যাতে ক্রেতা বান্ডেল সেটটি রিসিভ করতে পারেন।');
    }
    const chosenPickup = isSellerPlace ? undefined : pickupPoints.find((point) => point.id === pickupId);
    const drafts: BundleDraft[] = selectedSemesters.map((semester) => {
      const draft = semesterDrafts[semester];
      return {
        semester,
        originalPrice: draft.originalPrice,
        sellingPrice: draft.sellingPrice,
        pickupType: isSellerPlace ? 'seller_place' : 'campus_spot',
        sellerPlaceAddress: isSellerPlace ? sellerPlaceAddress.trim() : undefined,
        pickupPointId: isSellerPlace ? 'seller_place' : (chosenPickup?.id || pickupPoints[0]?.id || 'pk-1'),
        items: draft.items.map((item) => ({ bookId: item.book.id, publication: item.publication, condition: item.condition, conditionDetails: item.conditionDetails })),
      };
    });
    if (drafts.some((draft) => draft.items.length === 0 || draft.sellingPrice <= 0 || draft.originalPrice < draft.sellingPrice)) return setError('প্রতিটি নির্বাচিত সেমিস্টারের বই তালিকা ও সঠিক মূল্য থাকা আবশ্যক।');
    setBusy(true); setError('');
    try { await createBundleBatch(drafts); setDone({ type: 'semester', count: drafts.length }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'বান্ডেল প্রকাশ করা সম্ভব হয়নি।'); }
    finally { setBusy(false); }
  };

  return <div className="max-w-4xl mx-auto space-y-6">
    <header className="bg-white rounded-3xl border p-6 space-y-4">
      <span className="text-xs font-bold text-[#ef4d23] uppercase">বই বিক্রি</span>
      <h1 className="text-2xl font-bold">আপনি কীভাবে বই বিক্রি করতে চান?</h1>
      <div className="grid sm:grid-cols-2 gap-3">
        <button type="button" onClick={() => setMode('single')} className={`p-5 rounded-2xl border text-left cursor-pointer ${mode === 'single' ? 'border-[#ef4d23] bg-orange-50' : 'bg-white'}`}>
          <ShoppingBag className="text-[#ef4d23] mb-2" /><b>আমি একটি বই বিক্রি করতে চাই</b><p className="text-xs text-neutral-500 mt-1">আগ্রহী শিক্ষার্থীরা এই বইটি সম্পর্কে সরাসরি যোগাযোগ করতে পারবে।</p>
        </button>
        <button type="button" onClick={() => setMode('semester')} className={`p-5 rounded-2xl border text-left cursor-pointer ${mode === 'semester' ? 'border-[#ef4d23] bg-orange-50' : 'bg-white'}`}>
          <Layers3 className="text-[#ef4d23] mb-2" /><b>আমি সেমিস্টারের সব বই বিক্রি করতে চাই</b><p className="text-xs text-neutral-500 mt-1">এক বা একাধিক সেমিস্টারের সম্পূর্ণ সেট একবারে প্রকাশ করুন; ফুল সেট হিসেবে বিক্রি হবে।</p>
        </button>
      </div>
    </header>

    {mode === 'single' ? <form onSubmit={submitSingle} className="bg-white rounded-3xl border p-6 space-y-5">
      <div>
        <label className="text-xs font-bold uppercase text-neutral-500 block mb-1">আপনার টেকনোলজি / বিভাগ</label>
        <select
          value={selectedDept}
          onChange={(e) => {
            setSelectedDept(e.target.value);
            setModelId('');
          }}
          className="w-full p-3 rounded-xl border border-neutral-200 text-sm font-semibold text-[#0b0f1a] bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#ef4d23]"
        >
          {DEPARTMENTS.filter((d) => d !== 'All Departments').map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="relative"><Search className="absolute left-3 top-3.5 w-4 text-neutral-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="বিষয়ের নাম বা কোড দিয়ে খুঁজুন" className="w-full pl-10 p-3 rounded-xl border" /></div>
      <select value={modelId} onChange={(e) => { setModelId(e.target.value); setPublication(books.find((book) => book.id === e.target.value)?.publication || 'Haque Publication'); }} className="w-full p-3 rounded-xl border"><option value="">বিষয় নির্বাচন করুন</option>{matches.map((book) => <option key={book.id} value={book.id}>{book.subjectCode} — {book.title}</option>)}</select>
      {selected && <div className="p-4 rounded-2xl bg-[#f5f2ee] flex gap-3"><img src={getPublicationCover(selected, publication)} className="w-16 h-20 object-cover rounded-lg" alt="" /><div><b>{selected.title}</b><p className="text-xs">{selected.subjectCode}</p></div></div>}
      <div className="grid sm:grid-cols-2 gap-3"><select value={publication} onChange={(e) => setPublication(e.target.value as Publication)} className="p-3 rounded-xl border">{PUBLICATIONS.map((item) => <option key={item} value={item}>{item === 'Haque Publication' ? 'হক পাবলিকেশন' : item === 'Technical Publication' ? 'টেকনিক্যাল পাবলিকেশন' : item}</option>)}</select><select value={condition} onChange={(e) => setCondition(e.target.value as Condition)} className="p-3 rounded-xl border">{CONDITIONS.filter((item) => item !== 'All Conditions').map((item) => <option key={item} value={item}>{item === 'Like New' ? 'নতুন মতো' : item === 'Good' ? 'ভালো' : item === 'Fair' ? 'মোটামুটি' : 'ব্যবহারযোগ্য'}</option>)}</select></div>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} placeholder="বইয়ের অবস্থা সম্পর্কে অতিরিক্ত তথ্য (ঐচ্ছিক)" className="w-full p-3 rounded-xl border" />
      <div className="grid sm:grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-neutral-500 block mb-1">গায়ের দাম (৳)</label><input type="number" min={1} value={originalPrice} onChange={(e) => setOriginalPrice(Number(e.target.value))} className="w-full p-3 rounded-xl border" /></div><div><label className="text-xs font-semibold text-neutral-500 block mb-1">বিক্রয় মূল্য (৳)</label><input type="number" min={1} value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="w-full p-3 rounded-xl border" /></div></div>
      <div className="space-y-3">
        <label className="text-xs font-semibold text-neutral-500 block">বই হস্তান্তরের মাধ্যম / পিকআপ অপশন</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setPickupType('campus_spot');
              if (pickupId === 'seller_place') setPickupId(pickupPoints[0]?.id || '');
            }}
            className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
              pickupType === 'campus_spot' && pickupId !== 'seller_place'
                ? 'border-[#0b0f1a] bg-[#0b0f1a] text-white shadow-xs'
                : 'border-[#e5e5e5] bg-white hover:border-neutral-400 text-[#0b0f1a]'
            }`}
          >
            <MapPin className={`w-5 h-5 shrink-0 mt-0.5 ${pickupType === 'campus_spot' && pickupId !== 'seller_place' ? 'text-white' : 'text-[#ef4d23]'}`} />
            <div>
              <p className="text-sm font-bold">ক্যাম্পাস পিকআপ পয়েন্ট</p>
              <p className={`text-xs mt-0.5 ${pickupType === 'campus_spot' && pickupId !== 'seller_place' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                ক্যাম্পাসের নির্ধারিত ভেরিফিকেশন ডেস্কে বই হ্যান্ডওভার
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setPickupType('seller_place');
              setPickupId('seller_place');
            }}
            className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
              pickupType === 'seller_place' || pickupId === 'seller_place'
                ? 'border-[#ef4d23] bg-orange-50/90 text-[#0b0f1a] ring-2 ring-[#ef4d23]/20 shadow-xs'
                : 'border-[#e5e5e5] bg-white hover:border-neutral-400 text-[#0b0f1a]'
            }`}
          >
            <Home className="w-5 h-5 text-[#ef4d23] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#ef4d23]">Pick up from my place</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                ক্রেতা সরাসরি আপনার বাসা বা নির্ধারিত স্থান থেকে বই নেবেন
              </p>
            </div>
          </button>
        </div>

        <select
          value={pickupId}
          onChange={(e) => {
            const val = e.target.value;
            setPickupId(val);
            if (val === 'seller_place') setPickupType('seller_place');
            else setPickupType('campus_spot');
          }}
          className="w-full p-3 rounded-xl border bg-white text-sm"
        >
          <option value="seller_place">🏠 Pick up from my place (আমার বাসা বা স্থান থেকে পিকআপ)</option>
          <optgroup label="ক্যাম্পাস নির্ধারিত পিকআপ পয়েন্ট">
            {pickupPoints.map((point) => (
              <option key={point.id} value={point.id}>
                🏢 {point.name} — {point.campus}
              </option>
            ))}
          </optgroup>
        </select>

        {(pickupType === 'seller_place' || pickupId === 'seller_place') && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
              <Home className="w-4 h-4 text-[#ef4d23]" />
              <span>আপনার বাসা / নির্ধারিত স্থানের ঠিকানা ও বিবরণ (Seller Place Address) *</span>
            </div>
            <input
              type="text"
              required
              value={sellerPlaceAddress}
              onChange={(e) => setSellerPlaceAddress(e.target.value)}
              placeholder="যেমন: মিরপুর-১০, ব্লক-সি, রোড-৩, বাসা-১২ / পলিটেকনিক ছাত্রাবাস রুম ২০৪"
              className="w-full bg-white p-3 rounded-xl border border-amber-300 text-sm focus:outline-none focus:border-[#ef4d23]"
            />
            <p className="text-[12px] text-amber-900/90 leading-relaxed">
              📍 <b>বিশেষ নির্দেশনা:</b> ক্রেতাকে আপনার বাসা বা এই স্থান থেকে বইটি রিসিভ করতে হবে। প্রধান ওয়েবসাইটের লিস্টিং ও বিস্তারিত পেজে ক্রেতাদের এটি স্পষ্ট প্রদর্শন করা হবে।
            </p>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
      <Button type="submit" disabled={busy || !modelId}>{busy ? 'প্রকাশ হচ্ছে…' : 'একক বই লিস্টিং প্রকাশ করুন'}</Button>
    </form> : <form onSubmit={submitBundles} className="space-y-5">
      <section className="bg-white rounded-3xl border p-6 space-y-4">
        <div>
          <label className="text-xs font-bold uppercase text-neutral-500 block mb-1">বিভাগ / টেকনোলজি</label>
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedSemesters([]);
              setSemesterDrafts({});
            }}
            className="w-full sm:w-auto min-w-[280px] p-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-[#0b0f1a] bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#ef4d23] mb-2 cursor-pointer"
          >
            {DEPARTMENTS.filter((d) => d !== 'All Departments').map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <p className="text-sm text-neutral-500">এক বা একাধিক সেমিস্টার নির্বাচন করুন।</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{semesters.map((semester) => <button type="button" key={semester} onClick={() => toggleSemester(semester)} className={`p-3 rounded-xl border text-sm font-semibold cursor-pointer ${selectedSemesters.includes(semester) ? 'bg-[#0b0f1a] text-white' : 'bg-white'}`}>{semester}</button>)}</div>
        <div className="space-y-3 pt-2">
          <label className="text-xs font-semibold text-neutral-500 block">বই হস্তান্তরের মাধ্যম / পিকআপ অপশন</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setPickupType('campus_spot');
                if (pickupId === 'seller_place') setPickupId(pickupPoints[0]?.id || '');
              }}
              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                pickupType === 'campus_spot' && pickupId !== 'seller_place'
                  ? 'border-[#0b0f1a] bg-[#0b0f1a] text-white shadow-xs'
                  : 'border-[#e5e5e5] bg-white hover:border-neutral-400 text-[#0b0f1a]'
              }`}
            >
              <MapPin className={`w-5 h-5 shrink-0 mt-0.5 ${pickupType === 'campus_spot' && pickupId !== 'seller_place' ? 'text-white' : 'text-[#ef4d23]'}`} />
              <div>
                <p className="text-sm font-bold">ক্যাম্পাস পিকআপ পয়েন্ট</p>
                <p className={`text-xs mt-0.5 ${pickupType === 'campus_spot' && pickupId !== 'seller_place' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  ক্যাম্পাসের নির্ধারিত ভেরিফিকেশন ডেস্কে সেট হ্যান্ডওভার
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setPickupType('seller_place');
                setPickupId('seller_place');
              }}
              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                pickupType === 'seller_place' || pickupId === 'seller_place'
                  ? 'border-[#ef4d23] bg-orange-50/90 text-[#0b0f1a] ring-2 ring-[#ef4d23]/20 shadow-xs'
                  : 'border-[#e5e5e5] bg-white hover:border-neutral-400 text-[#0b0f1a]'
              }`}
            >
              <Home className="w-5 h-5 text-[#ef4d23] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-[#ef4d23]">Pick up from my place</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  ক্রেতা সরাসরি আপনার বাসা বা নির্ধারিত স্থান থেকে বই সেট নেবেন
                </p>
              </div>
            </button>
          </div>

          <select
            value={pickupId}
            onChange={(e) => {
              const val = e.target.value;
              setPickupId(val);
              if (val === 'seller_place') setPickupType('seller_place');
              else setPickupType('campus_spot');
            }}
            className="w-full p-3 rounded-xl border bg-white text-sm"
          >
            <option value="seller_place">🏠 Pick up from my place (আমার বাসা বা স্থান থেকে পিকআপ)</option>
            <optgroup label="ক্যাম্পাস নির্ধারিত পিকআপ পয়েন্ট">
              {pickupPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  🏢 {point.name} — {point.campus}
                </option>
              ))}
            </optgroup>
          </select>

          {(pickupType === 'seller_place' || pickupId === 'seller_place') && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
                <Home className="w-4 h-4 text-[#ef4d23]" />
                <span>আপনার বাসা / নির্ধারিত স্থানের ঠিকানা ও বিবরণ (Seller Place Address) *</span>
              </div>
              <input
                type="text"
                required
                value={sellerPlaceAddress}
                onChange={(e) => setSellerPlaceAddress(e.target.value)}
                placeholder="যেমন: পলিটেকনিক ছাত্রাবাস রুম ২০৪ / নিজস্ব বাসা"
                className="w-full bg-white p-3 rounded-xl border border-amber-300 text-sm focus:outline-none focus:border-[#ef4d23]"
              />
              <p className="text-[12px] text-amber-900/90 leading-relaxed">
                📍 <b>বিশেষ নির্দেশনা:</b> ক্রেতাকে আপনার স্থান বা বাসা থেকে সম্পূর্ণ সেমিস্টার সেটটি রিসিভ করতে হবে।
              </p>
            </div>
          )}
        </div>
      </section>
      {selectedSemesters.map((semester) => { const draft = semesterDrafts[semester]; if (!draft) return null; return <section key={semester} className="bg-white rounded-3xl border p-6 space-y-4">
        <div className="flex justify-between gap-3"><div><span className="text-xs font-bold text-[#ef4d23] uppercase">ফুল সেট</span><h3 className="text-xl font-bold">{semester}</h3><p className="text-sm text-neutral-500">{draft.items.length}টি অফিসিয়াল বই • আলাদা বিক্রয় প্রযোজ্য নয়</p></div></div>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-xs font-semibold">সর্বমোট গায়ের দাম (৳)<input type="number" min={1} value={draft.originalPrice} onChange={(e) => updateSemester(semester, { originalPrice: Number(e.target.value) })} className="block w-full mt-1 p-3 rounded-xl border" /></label><label className="text-xs font-semibold">ফুল সেট বিক্রয় মূল্য (৳)<input type="number" min={1} value={draft.sellingPrice} onChange={(e) => updateSemester(semester, { sellingPrice: Number(e.target.value) })} className="block w-full mt-1 p-3 rounded-xl border" /></label></div>
        <div className="space-y-3">{draft.items.map((item) => <div key={item.book.id} className="p-3 rounded-2xl border grid sm:grid-cols-[1fr_180px_150px] gap-2 items-center"><div><b className="text-sm">{item.book.subjectCode} — {item.book.title}</b><p className="text-xs text-neutral-500">এই সেটের জন্য আবশ্যক</p></div><select value={item.publication} onChange={(e) => updateBundleItem(semester, item.book.id, { publication: e.target.value as Publication })} className="p-2 rounded-lg border text-xs">{PUBLICATIONS.map((value) => <option key={value} value={value}>{value === 'Haque Publication' ? 'হক পাবলিকেশন' : value === 'Technical Publication' ? 'টেকনিক্যাল পাবলিকেশন' : value}</option>)}</select><select value={item.condition} onChange={(e) => updateBundleItem(semester, item.book.id, { condition: e.target.value as Condition })} className="p-2 rounded-lg border text-xs">{CONDITIONS.filter((value) => value !== 'All Conditions').map((value) => <option key={value} value={value}>{value === 'Like New' ? 'নতুন মতো' : value === 'Good' ? 'ভালো' : value === 'Fair' ? 'মোটামুটি' : 'ব্যবহারযোগ্য'}</option>)}</select><input value={item.conditionDetails} onChange={(e) => updateBundleItem(semester, item.book.id, { conditionDetails: e.target.value })} maxLength={500} placeholder="বইয়ের অবস্থা (ঐচ্ছিক)" className="sm:col-span-3 p-2 rounded-lg border text-xs" /></div>)}</div>
      </section>; })}
      {error && <p className="bg-rose-50 text-rose-700 p-3 rounded-xl text-sm">{error}</p>}
      <Button type="submit" disabled={busy || selectedSemesters.length === 0}>{busy ? 'বান্ডেল প্রকাশ করা হচ্ছে…' : `${selectedSemesters.length}টি সম্পূর্ণ সেমিস্টার সেট প্রকাশ করুন`}</Button>
    </form>}
  </div>;
};

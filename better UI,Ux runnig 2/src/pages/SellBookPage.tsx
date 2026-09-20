import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Layers3, Search, ShoppingBag } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { useSemesterBundles, type BundleDraft } from '../hooks/useSemesterBundles';
import type { BookListing, Condition, Publication } from '../types';
import { CONDITIONS } from '../data/mockData';
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
  const [condition, setCondition] = useState<Condition>('Good');
  const [publication, setPublication] = useState<Publication>('Haque Publication');
  const [details, setDetails] = useState('');
  const [originalPrice, setOriginalPrice] = useState(650);
  const [sellingPrice, setSellingPrice] = useState(350);
  const [pickupId, setPickupId] = useState(pickupPoints[0]?.id || '');
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([]);
  const [semesterDrafts, setSemesterDrafts] = useState<Record<string, SemesterDraft>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ type: 'single' | 'semester'; id?: string; count?: number } | null>(null);

  const department = currentUser.department;
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
    const target = books.find((book) => book.id === prefillSellData.id || (prefillSellData.subjectCode && book.subjectCode === prefillSellData.subjectCode));
    if (!target) return;
    setMode('single');
    setModelId(target.id);
    setPublication(target.publication || 'Haque Publication');
    if (prefillSellData.sellingPrice) setSellingPrice(prefillSellData.sellingPrice);
    setPrefillSellData(null);
  }, [books, prefillSellData, setPrefillSellData]);

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
      <h2 className="text-2xl font-bold">{done.type === 'single' ? 'Seller listing published' : `${done.count} semester bundle published`}</h2>
      <p>{done.type === 'single' ? 'Your physical copy is now live.' : 'প্রতিটি semester আলাদা complete-set bundle হিসেবে কেনা যাবে।'}</p>
      <Button onClick={() => done.id ? navigateToBook(done.id) : setActiveView('semester-bundles')}>View listing</Button>
    </div>
  );

  const submitSingle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return setError('Select a BTEB subject first.');
    if (sellingPrice <= 0 || originalPrice <= 0 || sellingPrice > originalPrice) return setError('Selling price must be positive and cannot exceed original price.');
    setBusy(true); setError('');
    try {
      const id = await addBookListing({ ...selected, bookModelId: selected.id, condition, publication, conditionDetails: details,
        originalPrice, sellingPrice, pickupPointId: pickupId, pickupPointName: pickupPoints.find((point) => point.id === pickupId)?.name || '', availability: 'Available' } as never);
      setDone({ type: 'single', id });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not publish listing.'); }
    finally { setBusy(false); }
  };

  const submitBundles = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!department) return setError('Complete your profile department first.');
    if (selectedSemesters.length === 0) return setError('Select at least one semester.');
    const drafts: BundleDraft[] = selectedSemesters.map((semester) => {
      const draft = semesterDrafts[semester];
      return { semester, originalPrice: draft.originalPrice, sellingPrice: draft.sellingPrice, pickupPointId: pickupId,
        items: draft.items.map((item) => ({ bookId: item.book.id, publication: item.publication, condition: item.condition, conditionDetails: item.conditionDetails })) };
    });
    if (drafts.some((draft) => draft.items.length === 0 || draft.sellingPrice <= 0 || draft.originalPrice < draft.sellingPrice)) return setError('Every selected semester needs its complete catalog and valid prices.');
    setBusy(true); setError('');
    try { await createBundleBatch(drafts); setDone({ type: 'semester', count: drafts.length }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not publish bundles.'); }
    finally { setBusy(false); }
  };

  return <div className="max-w-4xl mx-auto space-y-6">
    <header className="bg-white rounded-3xl border p-6 space-y-4">
      <span className="text-xs font-bold text-[#ef4d23] uppercase">Sell Now</span>
      <h1 className="text-2xl font-bold">আপনি কীভাবে বই বিক্রি করতে চান?</h1>
      <div className="grid sm:grid-cols-2 gap-3">
        <button type="button" onClick={() => setMode('single')} className={`p-5 rounded-2xl border text-left ${mode === 'single' ? 'border-[#ef4d23] bg-orange-50' : 'bg-white'}`}>
          <ShoppingBag className="text-[#ef4d23] mb-2" /><b>আমি একটি বই বিক্রি করতে চাই</b><p className="text-xs text-neutral-500 mt-1">Buyer এই বইটি আলাদাভাবে কিনতে পারবে।</p>
        </button>
        <button type="button" onClick={() => setMode('semester')} className={`p-5 rounded-2xl border text-left ${mode === 'semester' ? 'border-[#ef4d23] bg-orange-50' : 'bg-white'}`}>
          <Layers3 className="text-[#ef4d23] mb-2" /><b>আমি semester-এর সব বই বিক্রি করতে চাই</b><p className="text-xs text-neutral-500 mt-1">এক বা একাধিক semester একবারে publish করুন; প্রতিটি full set আলাদাভাবে বিক্রি হবে।</p>
        </button>
      </div>
    </header>

    {mode === 'single' ? <form onSubmit={submitSingle} className="bg-white rounded-3xl border p-6 space-y-5">
      <div><label className="text-xs font-bold uppercase">Your department</label><p className="font-semibold">{department || 'Profile department missing'}</p></div>
      <div className="relative"><Search className="absolute left-3 top-3.5 w-4 text-neutral-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subject name or code" className="w-full pl-10 p-3 rounded-xl border" /></div>
      <select value={modelId} onChange={(e) => { setModelId(e.target.value); setPublication(books.find((book) => book.id === e.target.value)?.publication || 'Haque Publication'); }} className="w-full p-3 rounded-xl border"><option value="">Select subject</option>{matches.map((book) => <option key={book.id} value={book.id}>{book.subjectCode} — {book.title}</option>)}</select>
      {selected && <div className="p-4 rounded-2xl bg-[#f5f2ee] flex gap-3"><img src={getPublicationCover(selected, publication)} className="w-16 h-20 object-cover rounded-lg" alt="" /><div><b>{selected.title}</b><p className="text-xs">{selected.subjectCode}</p></div></div>}
      <div className="grid sm:grid-cols-2 gap-3"><select value={publication} onChange={(e) => setPublication(e.target.value as Publication)} className="p-3 rounded-xl border">{PUBLICATIONS.map((item) => <option key={item}>{item}</option>)}</select><select value={condition} onChange={(e) => setCondition(e.target.value as Condition)} className="p-3 rounded-xl border">{CONDITIONS.filter((item) => item !== 'All Conditions').map((item) => <option key={item}>{item}</option>)}</select></div>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} placeholder="Condition notes" className="w-full p-3 rounded-xl border" />
      <div className="grid sm:grid-cols-2 gap-3"><input type="number" min={1} value={originalPrice} onChange={(e) => setOriginalPrice(Number(e.target.value))} className="p-3 rounded-xl border" /><input type="number" min={1} value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="p-3 rounded-xl border" /></div>
      <select value={pickupId} onChange={(e) => setPickupId(e.target.value)} className="w-full p-3 rounded-xl border">{pickupPoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}</select>
      {error && <p className="text-sm text-rose-600">{error}</p>}<Button type="submit" disabled={busy || !modelId}>{busy ? 'Publishing…' : 'Publish single book'}</Button>
    </form> : <form onSubmit={submitBundles} className="space-y-5">
      <section className="bg-white rounded-3xl border p-6 space-y-4"><div><p className="text-xs font-bold uppercase">Department</p><h2 className="text-xl font-bold">{department || 'Complete your profile first'}</h2><p className="text-sm text-neutral-500">একটি বা একাধিক semester নির্বাচন করুন।</p></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{semesters.map((semester) => <button type="button" key={semester} onClick={() => toggleSemester(semester)} className={`p-3 rounded-xl border text-sm font-semibold ${selectedSemesters.includes(semester) ? 'bg-[#0b0f1a] text-white' : 'bg-white'}`}>{semester}</button>)}</div>
        <select value={pickupId} onChange={(e) => setPickupId(e.target.value)} className="w-full p-3 rounded-xl border">{pickupPoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}</select>
      </section>
      {selectedSemesters.map((semester) => { const draft = semesterDrafts[semester]; if (!draft) return null; return <section key={semester} className="bg-white rounded-3xl border p-6 space-y-4">
        <div className="flex justify-between gap-3"><div><span className="text-xs font-bold text-[#ef4d23] uppercase">Full set</span><h3 className="text-xl font-bold">{semester}</h3><p className="text-sm text-neutral-500">{draft.items.length} official catalog books • individual purchase disabled</p></div></div>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-xs font-semibold">Total original price<input type="number" min={1} value={draft.originalPrice} onChange={(e) => updateSemester(semester, { originalPrice: Number(e.target.value) })} className="block w-full mt-1 p-3 rounded-xl border" /></label><label className="text-xs font-semibold">Full-set selling price<input type="number" min={1} value={draft.sellingPrice} onChange={(e) => updateSemester(semester, { sellingPrice: Number(e.target.value) })} className="block w-full mt-1 p-3 rounded-xl border" /></label></div>
        <div className="space-y-3">{draft.items.map((item) => <div key={item.book.id} className="p-3 rounded-2xl border grid sm:grid-cols-[1fr_180px_150px] gap-2 items-center"><div><b className="text-sm">{item.book.subjectCode} — {item.book.title}</b><p className="text-xs text-neutral-500">Required in this complete set</p></div><select value={item.publication} onChange={(e) => updateBundleItem(semester, item.book.id, { publication: e.target.value as Publication })} className="p-2 rounded-lg border text-xs">{PUBLICATIONS.map((value) => <option key={value}>{value}</option>)}</select><select value={item.condition} onChange={(e) => updateBundleItem(semester, item.book.id, { condition: e.target.value as Condition })} className="p-2 rounded-lg border text-xs">{CONDITIONS.filter((value) => value !== 'All Conditions').map((value) => <option key={value}>{value}</option>)}</select><input value={item.conditionDetails} onChange={(e) => updateBundleItem(semester, item.book.id, { conditionDetails: e.target.value })} maxLength={500} placeholder="Condition notes (optional)" className="sm:col-span-3 p-2 rounded-lg border text-xs" /></div>)}</div>
      </section>; })}
      {error && <p className="bg-rose-50 text-rose-700 p-3 rounded-xl text-sm">{error}</p>}
      <Button type="submit" disabled={busy || selectedSemesters.length === 0}>{busy ? 'Publishing bundles…' : `Publish ${selectedSemesters.length} complete semester set${selectedSemesters.length === 1 ? '' : 's'}`}</Button>
    </form>}
  </div>;
};

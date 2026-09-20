import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Search } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import type { Condition, Publication } from '../types';
import { CONDITIONS } from '../data/mockData';
import { Button } from '../components/common/Button';
import { getPublicationCover, hasPublicationCover } from '../lib/publicationEditions';

const normalizeDepartment = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'computer technology' || normalized === 'computer science and technology') {
    return 'Computer Science & Technology';
  }
  return value.trim();
};

const PUBLICATIONS: Publication[] = ['Haque Publication', 'Technical Publication'];

export const SellBookPage: React.FC = () => {
  const {
    books,
    addBookListing,
    navigateToBook,
    user,
    currentUser,
    openAuthModal,
    setActiveView,
    pickupPoints,
    prefillSellData,
    setPrefillSellData,
  } = useMarketplace();

  const [department, setDepartment] = useState(() => normalizeDepartment(currentUser.department || ''));
  const [semester, setSemester] = useState(currentUser.semester || '');
  const [query, setQuery] = useState('');
  const [modelId, setModelId] = useState('');
  const [condition, setCondition] = useState<Condition>('Good');
  const [publication, setPublication] = useState<Publication>('Haque Publication');
  const [details, setDetails] = useState('');
  const [originalPrice, setOriginalPrice] = useState(650);
  const [sellingPrice, setSellingPrice] = useState(350);
  const [pickupId, setPickupId] = useState(pickupPoints[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const departments = useMemo(() => {
    const values = books.flatMap((book) =>
      book.curriculumEntries?.length
        ? book.curriculumEntries.map((entry) => entry.department)
        : [book.department],
    );
    return Array.from(new Set(values.filter(Boolean))).sort();
  }, [books]);

  useEffect(() => {
    if (!department && departments.length > 0) {
      const profileDepartment = normalizeDepartment(currentUser.department || '');
      setDepartment(departments.includes(profileDepartment) ? profileDepartment : departments[0]);
    }
  }, [currentUser.department, department, departments]);

  const semesters = useMemo(() => {
    const values = books.flatMap((book) => {
      if (book.curriculumEntries?.length) {
        return book.curriculumEntries
          .filter((entry) => !department || entry.department === department)
          .map((entry) => entry.semester);
      }
      return !department || book.department === department ? [book.semester] : [];
    });
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  }, [books, department]);

  useEffect(() => {
    if (semesters.length > 0 && !semesters.includes(semester)) {
      const profileSemester = currentUser.semester || '';
      setSemester(semesters.includes(profileSemester) ? profileSemester : semesters[0]);
      setModelId('');
    }
  }, [currentUser.semester, semester, semesters]);

  const eligibleBooks = useMemo(() => {
    return books.filter((book) => {
      if (book.curriculumEntries?.length) {
        return book.curriculumEntries.some(
          (entry) => entry.department === department && entry.semester === semester,
        );
      }
      return book.department === department && book.semester === semester;
    });
  }, [books, department, semester]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return eligibleBooks.filter(
      (book) => !q || [book.title, book.subjectCode, book.subjectName].some((value) => value.toLowerCase().includes(q)),
    );
  }, [eligibleBooks, query]);

  useEffect(() => {
    if (!prefillSellData || books.length === 0) return;
    const target = books.find(
      (book) =>
        book.id === prefillSellData.id ||
        (prefillSellData.subjectCode && book.subjectCode === prefillSellData.subjectCode),
    );
    if (!target) return;
    const requestedDepartment = normalizeDepartment(prefillSellData.department || '');
    const mapping = target.curriculumEntries?.find(
      (entry) => !requestedDepartment || entry.department === requestedDepartment,
    ) ?? target.curriculumEntries?.[0];
    setDepartment(mapping?.department || requestedDepartment || target.department);
    setSemester(mapping?.semester || prefillSellData.semester || target.semester);
    setModelId(target.id);
    setPublication(target.publication || 'Haque Publication');
    if (prefillSellData.sellingPrice) setSellingPrice(prefillSellData.sellingPrice);
    setPrefillSellData(null);
  }, [books, prefillSellData, setPrefillSellData]);

  useEffect(() => {
    if (!pickupId && pickupPoints[0]) setPickupId(pickupPoints[0].id);
  }, [pickupId, pickupPoints]);

  const selected = books.find((book) => book.id === modelId);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-3xl border p-8 text-center space-y-4">
        <BookOpen className="mx-auto text-[#ef4d23]" />
        <h2 className="text-xl font-bold">বই বিক্রি করতে লগইন করুন</h2>
        <Button onClick={() => openAuthModal('login', 'বই বিক্রি করতে লগইন করুন')}>লগইন করুন</Button>
        <Button variant="outline" onClick={() => setActiveView('browse')}>বই দেখুন</Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-3xl border p-10 text-center space-y-4">
        <CheckCircle2 className="mx-auto w-12 h-12 text-emerald-600" />
        <h2 className="text-2xl font-bold">Seller listing published</h2>
        <p>Your physical copy is now offered under <b>{selected?.title}</b>.</p>
        <Button onClick={() => navigateToBook(done)}>View model page</Button>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return setError('Select a BTEB subject first.');
    if (!pickupId) return setError('Select a pickup point.');
    if (sellingPrice <= 0 || originalPrice <= 0 || sellingPrice > originalPrice) {
      return setError('Selling price must be positive and cannot exceed the original price.');
    }
    setBusy(true);
    setError('');
    try {
      const id = await addBookListing({
        ...selected,
        bookModelId: selected.id,
        condition,
        publication,
        conditionDetails: details,
        originalPrice,
        sellingPrice,
        pickupPointId: pickupId,
        pickupPointName: pickupPoints.find((point) => point.id === pickupId)?.name || '',
        availability: 'Available',
      } as never);
      setDone(id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not publish listing.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="bg-white rounded-3xl border p-6">
        <span className="text-xs font-bold text-[#ef4d23] uppercase">Sell Now</span>
        <h1 className="text-2xl font-bold">Choose a syllabus subject, then list your copy</h1>
        <p className="text-sm text-neutral-500">Academic metadata comes from the BTEB catalog. You only add your physical copy’s details.</p>
      </header>

      <form onSubmit={submit} className="bg-white rounded-3xl border p-6 space-y-6">
        <section className="space-y-3">
          <label className="text-xs font-bold uppercase">1. BTEB syllabus subject</label>
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={department}
              onChange={(event) => { setDepartment(event.target.value); setModelId(''); }}
              className="w-full p-3 rounded-xl border"
              aria-label="Department"
            >
              {departments.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select
              value={semester}
              onChange={(event) => { setSemester(event.target.value); setModelId(''); }}
              className="w-full p-3 rounded-xl border"
              aria-label="Semester"
            >
              {semesters.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search subject name or code"
              className="w-full pl-10 p-3 rounded-xl border"
            />
          </div>
          <select
            value={modelId}
            onChange={(event) => { const nextId = event.target.value; setModelId(nextId); setPublication(books.find((book) => book.id === nextId)?.publication || 'Haque Publication'); }}
            className="w-full p-3 rounded-xl border"
            aria-label="Subject"
          >
            <option value="">Select subject</option>
            {matches.map((book) => (
              <option value={book.id} key={book.id}>{book.subjectCode} — {book.title}</option>
            ))}
          </select>
          {eligibleBooks.length === 0 && (
            <p className="text-xs text-amber-700">No catalog model is available for this department and semester. Ask an admin to apply the BTEB curriculum migration.</p>
          )}
        </section>

        {selected && (
          <section className="p-4 rounded-2xl bg-[#f5f2ee] flex gap-3">
            <img src={getPublicationCover(selected, publication)} className="w-16 h-20 rounded-lg object-cover" alt={`${selected.title} — ${publication}`} />
            <div>
              <b>{selected.title}</b>
              <p className="text-xs text-neutral-500">{department} • {semester}</p>
              <p className="text-xs font-mono mt-1">BTEB {selected.subjectCode}</p>
              <p className={`text-xs font-semibold mt-1 ${hasPublicationCover(selected, publication) ? 'text-emerald-700' : 'text-amber-700'}`}>{publication} • {hasPublicationCover(selected, publication) ? 'Cover available' : 'Cover coming soon'}</p>
              <p className="text-xs text-neutral-500 mt-1">Subject code is fixed by the catalog.</p>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <label className="text-xs font-bold uppercase">2. Your physical copy</label>
          <div>
            <label className="text-xs font-semibold text-neutral-700">Publication *</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PUBLICATIONS.map((value) => (
                <button type="button" key={value} onClick={() => setPublication(value)} className={`p-3 rounded-xl border text-sm font-semibold ${publication === value ? 'bg-[#0b0f1a] text-white border-[#0b0f1a]' : 'bg-white text-neutral-700'}`}>
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CONDITIONS.filter((value) => value !== 'All Conditions').map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setCondition(value as Condition)}
                className={`p-2 rounded-xl border text-xs font-semibold ${condition === value ? 'bg-[#0b0f1a] text-white' : 'bg-white'}`}
              >
                {value}
              </button>
            ))}
          </div>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={3} placeholder="Writing, highlighting, missing pages, cover condition…" className="w-full p-3 rounded-xl border" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="number" min={1} value={originalPrice} onChange={(event) => setOriginalPrice(Number(event.target.value))} className="p-3 rounded-xl border" placeholder="Original price" />
            <input type="number" min={1} max={originalPrice} value={sellingPrice} onChange={(event) => setSellingPrice(Number(event.target.value))} className="p-3 rounded-xl border" placeholder="Selling price" />
          </div>
          <select value={pickupId} onChange={(event) => setPickupId(event.target.value)} className="w-full p-3 rounded-xl border">
            {pickupPoints.map((point) => <option value={point.id} key={point.id}>{point.name}</option>)}
          </select>
        </section>

        <p className="text-xs text-neutral-500">The admin-managed model cover is used for every seller offer.</p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" disabled={busy || !modelId || !pickupId}>{busy ? 'Publishing…' : `Publish seller offer — ৳${sellingPrice}`}</Button>
      </form>
    </div>
  );
};

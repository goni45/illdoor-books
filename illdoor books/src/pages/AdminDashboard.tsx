import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  BookOpen,
  ShoppingBag,
  Users,
  AlertCircle,
  TrendingUp,
  MapPin,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Search,
  Filter,
  IdCard,
  Loader2,
  BadgeCheck,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { supabase } from '../lib/supabase';
import type { BookListing } from '../types';
import type { Publication } from '../types';

type ModelFormState = {
  id: string;
  title: string;
  author: string;
  edition: string;
  subjectCode: string;
  subjectName: string;
  publication: Publication;
  regulation: string;
  technologyCode: string;
  department: string;
  semester: string;
  commonImageUrl: string;
  isbn: string;
  status: 'active' | 'hidden';
  haqueCoverUrl: string;
  haqueSourceUrl: string;
  haqueAuthor: string;
  haqueEdition: string;
  haqueReferencePrice: string;
  technicalCoverUrl: string;
  technicalSourceUrl: string;
  technicalAuthor: string;
  technicalEdition: string;
  technicalReferencePrice: string;
};

const EMPTY_MODEL_FORM: ModelFormState = {
  id: '', title: '', author: '', edition: '', subjectCode: '', subjectName: '', publication: 'Haque Publication',
  regulation: '2022', technologyCode: '85', department: 'Computer Science & Technology',
  semester: '1st Semester', commonImageUrl: '', isbn: '', status: 'active',
  haqueCoverUrl: '', haqueSourceUrl: '', haqueAuthor: '', haqueEdition: '', haqueReferencePrice: '',
  technicalCoverUrl: '', technicalSourceUrl: '', technicalAuthor: '', technicalEdition: '', technicalReferencePrice: '',
};

const SEMESTERS = Array.from({ length: 8 }, (_, index) => {
  const value = index + 1;
  const suffix = value === 1 ? 'st' : value === 2 ? 'nd' : value === 3 ? 'rd' : 'th';
  return `${value}${suffix} Semester`;
});

export const AdminDashboard: React.FC = () => {
  const {
    books,
    orders,
    disputes,
    resolveDispute,
    deleteBookListing,
    updateBookStatus,
    setActiveView,
    navigateToBook,
    navigateToOrder,
    verificationQueue,
    decideVerification,
    refreshBooks,
  } = useMarketplace();

  const [activeAdminTab, setActiveAdminTab] = useState<
    'overview' | 'models' | 'listings' | 'orders' | 'disputes' | 'verification'
  >('overview');

  const [adminSearch, setAdminSearch] = useState('');
  const [modelForm, setModelForm] = useState<ModelFormState>(EMPTY_MODEL_FORM);
  const [modelEditorOpen, setModelEditorOpen] = useState(false);
  const [modelBusy, setModelBusy] = useState(false);

  const openCreateModel = () => {
    setModelForm(EMPTY_MODEL_FORM);
    setAdminActionMessage(null);
    setModelEditorOpen(true);
  };

  const openEditModel = async (book: BookListing) => {
    const { data, error } = await supabase
      .from('books')
      .select('common_image_url')
      .eq('id', book.id)
      .single();
    if (error) {
      setAdminActionMessage(error.message);
      return;
    }
    const mapping = book.curriculumEntries?.[0];
    const haque = book.publicationEditions?.find((edition) => edition.publication === 'Haque Publication');
    const technical = book.publicationEditions?.find((edition) => edition.publication === 'Technical Publication');
    setModelForm({
      id: book.id,
      title: book.title,
      author: book.author,
      edition: book.edition || '',
      subjectCode: book.subjectCode,
      subjectName: book.subjectName,
      publication: book.publication || 'Haque Publication',
      regulation: book.regulation || mapping?.regulation || '2022',
      technologyCode: mapping?.technologyCode || '',
      department: mapping?.department || book.department,
      semester: mapping?.semester || book.semester,
      commonImageUrl: data?.common_image_url || '',
      isbn: book.isbn || '',
      status: book.status || 'active',
      haqueCoverUrl: haque?.coverImageUrl || '',
      haqueSourceUrl: haque?.sourceUrl || '',
      haqueAuthor: haque?.authorOverride || '',
      haqueEdition: haque?.editionLabel || '',
      haqueReferencePrice: haque?.referencePrice?.toString() || '',
      technicalCoverUrl: technical?.coverImageUrl || '',
      technicalSourceUrl: technical?.sourceUrl || '',
      technicalAuthor: technical?.authorOverride || '',
      technicalEdition: technical?.editionLabel || '',
      technicalReferencePrice: technical?.referencePrice?.toString() || '',
    });
    setAdminActionMessage(null);
    setModelEditorOpen(true);
  };

  const saveBookModel = async (event: React.FormEvent) => {
    event.preventDefault();
    setModelBusy(true);
    setAdminActionMessage(null);
    const { data: savedModelId, error } = await supabase.rpc('admin_upsert_book_model', {
      p_book_id: modelForm.id || null,
      p_title: modelForm.title.trim(),
      p_author: modelForm.author.trim(),
      p_edition: modelForm.edition.trim() || null,
      p_subject_code: modelForm.subjectCode.trim(),
      p_subject_name: modelForm.subjectName.trim() || modelForm.title.trim(),
      p_publication: modelForm.publication,
      p_regulation: modelForm.regulation.trim() || '2022',
      p_technology_code: modelForm.technologyCode.trim(),
      p_department: modelForm.department.trim(),
      p_semester: modelForm.semester,
      p_common_image_url: modelForm.commonImageUrl.trim() || null,
      p_isbn: modelForm.isbn.trim() || null,
      p_status: modelForm.status,
    });
    if (error) {
      setModelBusy(false);
      setAdminActionMessage(error.message);
      return;
    }
    const modelId = String(savedModelId || modelForm.id);
    const editionInputs = [
      { publication: 'Haque Publication', cover: modelForm.haqueCoverUrl, source: modelForm.haqueSourceUrl, author: modelForm.haqueAuthor, edition: modelForm.haqueEdition, price: modelForm.haqueReferencePrice },
      { publication: 'Technical Publication', cover: modelForm.technicalCoverUrl, source: modelForm.technicalSourceUrl, author: modelForm.technicalAuthor, edition: modelForm.technicalEdition, price: modelForm.technicalReferencePrice },
    ] as const;
    const editionResults = await Promise.all(editionInputs.map((item) => supabase.rpc('admin_upsert_book_publication_edition', {
      p_book_id: modelId,
      p_publication: item.publication,
      p_cover_image_url: item.cover.trim() || null,
      p_source_url: item.source.trim() || null,
      p_author_override: item.author.trim() || null,
      p_edition_label: item.edition.trim() || null,
      p_reference_price: item.price ? Number(item.price) : null,
      p_source_product_id: null,
    })));
    setModelBusy(false);
    const editionError = editionResults.find((result) => result.error)?.error;
    if (editionError) {
      setAdminActionMessage(`Model saved, but publication details failed: ${editionError.message}`);
      await refreshBooks();
      return;
    }
    setModelEditorOpen(false);
    setAdminActionMessage(modelForm.id ? 'Book model updated in the database.' : 'Book model and curriculum mapping created.');
    await refreshBooks();
  };

  const toggleModelStatus = async (book: BookListing) => {
    const nextStatus = book.status === 'hidden' ? 'active' : 'hidden';
    const { error } = await supabase.rpc('admin_set_book_model_status', {
      p_book_id: book.id,
      p_status: nextStatus,
    });
    if (error) setAdminActionMessage(error.message);
    else {
      setAdminActionMessage(nextStatus === 'hidden' ? 'Book model hidden.' : 'Book model activated.');
      await refreshBooks();
    }
  };

  const deleteBookModel = async (book: BookListing) => {
    if (!window.confirm(`Permanently delete “${book.title}”? This only works when it has no seller listings or wishlist references.`)) return;
    setModelBusy(true);
    const { error } = await supabase.rpc('admin_delete_book_model', { p_book_id: book.id });
    setModelBusy(false);
    if (error) setAdminActionMessage(error.message);
    else {
      setAdminActionMessage('Unused book model permanently deleted.');
      await refreshBooks();
    }
  };


  // Student ID verification queue state
  const [idCardLoading, setIdCardLoading] = useState<string | null>(null);
  const [verificationBusy, setVerificationBusy] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);

  const handleViewIdCard = async (path: string | null) => {
    if (!path) return;
    setIdCardLoading(path);
    const { getStudentIdSignedUrl } = await import('../lib/imageUpload');
    const url = await getStudentIdSignedUrl(path);
    setIdCardLoading(null);

    if (url) {
      window.open(url, '_blank', 'noopener');
    } else {
      setAdminActionMessage('Could not open that ID card image. Please refresh and try again.');
    }
  };

  const handleVerificationDecision = async (
    requestId: string,
    decision: 'approved' | 'rejected'
  ) => {
    setVerificationBusy(requestId);
    setAdminActionMessage(null);
    await decideVerification(requestId, decision, adminNotes[requestId] || '');
    setVerificationBusy(null);
    setAdminActionMessage(
      decision === 'approved'
        ? 'Student verified — the badge is live on their profile.'
        : 'Verification rejected — the student has been notified.'
    );
  };

  // REAL COMPUTED METRICS from actual application data (no hardcoded fake numbers)
  const allSellerListings = books.flatMap((book) => (book.offers ?? []).map((offer) => ({ ...book, listingId: offer.id, seller: offer.seller, condition: offer.condition, conditionDetails: offer.conditionDetails, originalPrice: offer.originalPrice, sellingPrice: offer.sellingPrice, savings: offer.savings, availability: offer.availability, pickupPointId: offer.pickupPointId, pickupPointName: offer.pickupPointName })));
  const totalListings = allSellerListings.length;
  const activeListings = allSellerListings.filter((b) => b.availability === 'Available').length;
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;
  const pendingDropoffs = orders.filter((o) => o.status === 'confirmed' || o.status === 'placed').length;
  const pendingPickups = orders.filter((o) => o.status === 'ready_for_pickup' || o.status === 'dropped_off').length;
  const openDisputes = disputes.filter((d) => d.status !== 'Resolved').length;
  const pendingVerifications = verificationQueue.filter((v) => v.status === 'pending').length;
  const totalEscrowVolume = orders.reduce((sum, o) => sum + o.price, 0);
  const pendingPayouts = orders
    .filter((o) => o.paymentState === 'Paid (Escrow)')
    .reduce((sum, o) => sum + o.price, 0);

  // Search filtered listings
  const filteredAdminListings = allSellerListings.filter((b) =>
    adminSearch
      ? b.title.toLowerCase().includes(adminSearch.toLowerCase()) ||
        b.subjectCode.includes(adminSearch) ||
        b.seller.name.toLowerCase().includes(adminSearch.toLowerCase())
      : true
  );
  const filteredModels = books.filter((book) => {
    const query = adminSearch.trim().toLowerCase();
    return !query || [book.title, book.subjectCode, book.subjectName, book.department]
      .some((value) => value.toLowerCase().includes(query));
  });

  return (
    <div className="bg-[#0b0f1a] -mx-3 sm:-mx-4 -mt-3 sm:-mt-6 p-4 sm:p-6 lg:p-8 min-h-screen text-slate-100 rounded-3xl space-y-6">
      {/* Top Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ef4d23] text-white flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                পলিটেকনিক মার্কেটপ্লেস অ্যাডমিন ও অপারেশন
              </h1>
              <span className="text-[10px] uppercase font-mono tracking-widest bg-[#ef4d23]/20 text-[#ef4d23] px-2 py-0.5 rounded border border-[#ef4d23]/40">
                স্টাফ ডেস্ক
              </span>
            </div>
            <p className="text-xs text-slate-400">
              ক্যাম্পাস পিকআপ স্টেশন লজিস্টিকস, বিরোধ নিষ্পত্তি ও এসক্রো হিসাব
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveView('home')}
          className="flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full border border-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>শিক্ষার্থী মার্কেটপ্লেসে ফিরে যান</span>
        </button>
      </div>

      {/* Admin Nav Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        <button
          onClick={() => setActiveAdminTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeAdminTab === 'overview'
              ? 'bg-[#ef4d23] text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          অপারেশন সারসংক্ষেপ
        </button>
        <button onClick={() => setActiveAdminTab('models')} className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer ${activeAdminTab === 'models' ? 'bg-[#ef4d23] text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}>
          বই ক্যাটালগ মডেল ({books.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('listings')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeAdminTab === 'listings'
              ? 'bg-[#ef4d23] text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          লিস্টিং মডারেশন ({totalListings})
        </button>
        <button
          onClick={() => setActiveAdminTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeAdminTab === 'orders'
              ? 'bg-[#ef4d23] text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          অর্ডার ও পিকআপ এসক্রো ({orders.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('disputes')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeAdminTab === 'disputes'
              ? 'bg-[#ef4d23] text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>বিরোধ ও অভিযোগ</span>
          {openDisputes > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
              {openDisputes}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('verification')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeAdminTab === 'verification'
              ? 'bg-[#ef4d23] text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>শিক্ষার্থী ভেরিফিকেশন</span>
          {pendingVerifications > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-[#0b0f1a] text-[10px] flex items-center justify-center font-bold">
              {pendingVerifications}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6">
          {/* Real Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                সক্রিয় লিস্টিং
              </span>
              <p className="text-2xl font-bold text-white mt-1">
                {activeListings}
              </p>
              <span className="text-[11px] text-slate-500">
                মোট {totalListings} টির মধ্যে
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                মোট অর্ডার
              </span>
              <p className="text-2xl font-bold text-sky-400 mt-1">
                {totalOrders}
              </p>
              <span className="text-[11px] text-slate-500">
                {completedOrders} টি সম্পন্ন
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                ড্রপ-অফ অপেক্ষমাণ
              </span>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {pendingDropoffs}
              </p>
              <span className="text-[11px] text-slate-500">বিক্রেতার জমা দেওয়ার অপেক্ষায়</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                পিকআপ অপেক্ষমাণ
              </span>
              <p className="text-2xl font-bold text-[#ef4d23] mt-1">
                {pendingPickups}
              </p>
              <span className="text-[11px] text-slate-500">ক্যাম্পাস ডেস্কে প্রস্তুত</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                এসক্রো ভলিউম
              </span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                ৳{totalEscrowVolume}
              </p>
              <span className="text-[11px] text-slate-500">
                ৳{pendingPayouts} এসক্রোতে সংরক্ষিত
              </span>
            </div>
          </div>

          {/* Quick Recent Activity Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders Overview */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#ef4d23]" />
                  <span>সাম্প্রতিক ক্যাম্পাস লেনদেন</span>
                </h3>
                <button
                  onClick={() => setActiveAdminTab('orders')}
                  className="text-xs text-[#ef4d23] hover:underline cursor-pointer"
                >
                  সব দেখুন
                </button>
              </div>

              <div className="divide-y divide-slate-800">
                {orders.slice(0, 3).map((ord) => (
                  <div key={ord.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-white">
                        #{ord.orderNumber}
                      </span>
                      <p className="text-slate-400 truncate max-w-[200px]">
                        {ord.book.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white">৳{ord.price}</span>
                      <div className="text-[10px] text-slate-400">
                        পিন: <span className="font-mono text-[#ef4d23]">{ord.verificationPin}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Disputes Overview */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>শিক্ষার্থী বিরোধ তালিকা</span>
                </h3>
                <button
                  onClick={() => setActiveAdminTab('disputes')}
                  className="text-xs text-[#ef4d23] hover:underline cursor-pointer"
                >
                  সব দেখুন
                </button>
              </div>

              <div className="divide-y divide-slate-800">
                {disputes.map((dsp) => (
                  <div key={dsp.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white">
                        {dsp.reason}
                      </span>
                      <p className="text-slate-400 text-[11px]">
                        {dsp.orderNumber} • {dsp.reportedBy}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        dsp.status === 'Resolved'
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {dsp.status === 'Resolved' ? 'মীমাংসিত' : 'অপেক্ষমাণ'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'models' && (
        <div className="space-y-4">
          {adminActionMessage && (
            <div className={`p-3 rounded-xl border text-xs ${['error','cannot','invalid','required','not found','has seller','wishlist','duplicate'].some((word)=>adminActionMessage.toLowerCase().includes(word)) ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-emerald-950/30 border-emerald-800 text-emerald-300'}`}>
              {adminActionMessage}
            </div>
          )}

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div><h3 className="font-bold text-white">বই ক্যাটালগ মডেল ম্যানেজার</h3><p className="text-xs text-slate-400">ডাটাবেজ-ভিত্তিক পাঠ্যবই মডেল তৈরি, সম্পাদনা, প্রদর্শন বা অপসারণ করুন।</p></div>
              <div className="flex items-center gap-2">
                <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={adminSearch} onChange={(event)=>setAdminSearch(event.target.value)} placeholder="মডেল খুঁজুন..." className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white"/></div>
                <button onClick={openCreateModel} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ef4d23] text-white text-xs font-bold"><Plus className="w-4 h-4"/>নতুন মডেল</button>
              </div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-400 border-b border-slate-800"><th className="py-3">বই মডেল</th><th>কোড</th><th>প্রকাশনী</th><th>স্ট্যাটাস</th><th>অফার</th><th>সর্বনিম্ন</th><th className="text-right">অ্যাকশন</th></tr></thead><tbody>{filteredModels.map((b)=><tr key={b.id} className="border-b border-slate-800"><td className="py-3"><b className="text-white">{b.title}</b><div className="text-slate-500">{b.department} • {b.semester}</div></td><td className="text-[#ef4d23] font-mono">{b.subjectCode}</td><td><span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${b.publication==='Technical Publication'?'bg-sky-950 text-sky-300 border-sky-800':'bg-orange-950 text-orange-300 border-orange-800'}`}>{b.publication || 'Haque Publication'}</span></td><td><span className={`px-2 py-1 rounded-full ${b.status==='hidden'?'bg-slate-800 text-slate-400':'bg-emerald-950 text-emerald-300'}`}>{b.status === 'hidden' ? 'লুকায়িত' : 'সক্রিয়'}</span></td><td>{b.sellerCount ?? 0}</td><td>{b.lowestPrice ? `৳${b.lowestPrice}` : '—'}</td><td className="text-right"><div className="flex justify-end gap-3"><button onClick={()=>navigateToBook(b.id)} title="দেখুন" className="text-sky-400"><Eye className="w-4 h-4"/></button><button onClick={()=>void openEditModel(b)} title="সম্পাদনা" className="text-amber-400"><Pencil className="w-4 h-4"/></button><button onClick={()=>void toggleModelStatus(b)} title={b.status==='hidden'?'সক্রিয় করুন':'লুকান'} className="text-violet-400">{b.status==='hidden'?<Eye className="w-4 h-4"/>:<EyeOff className="w-4 h-4"/>}</button><button onClick={()=>void deleteBookModel(b)} disabled={modelBusy} title="মডেল মুছুন" className="text-rose-400 disabled:opacity-40"><Trash2 className="w-4 h-4"/></button></div></td></tr>)}</tbody></table></div>
          </div>

          {modelEditorOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!modelBusy)setModelEditorOpen(false);}}>
              <form onSubmit={saveBookModel} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-5">
                <div className="flex justify-between items-start"><div><h3 className="text-lg font-bold text-white">{modelForm.id ? 'বই মডেল সম্পাদনা' : 'নতুন বই মডেল তৈরি'}</h3><p className="text-xs text-slate-400">পরিবর্তনসমূহ সরাসরি মূল ডাটাবেজে সংরক্ষিত হবে।</p></div><button type="button" disabled={modelBusy} onClick={()=>setModelEditorOpen(false)} className="text-slate-400"><X className="w-5 h-5"/></button></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="text-xs text-slate-300 sm:col-span-2">বইয়ের শিরোনাম *<input required maxLength={180} value={modelForm.title} onChange={(e)=>setModelForm({...modelForm,title:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">বিষয় কোড *<input required maxLength={40} value={modelForm.subjectCode} onChange={(e)=>setModelForm({...modelForm,subjectCode:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-mono"/></label>
                  <label className="text-xs text-slate-300">বিষয়ের নাম<input maxLength={180} value={modelForm.subjectName} onChange={(e)=>setModelForm({...modelForm,subjectName:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">ডিফল্ট প্রকাশনী *<select value={modelForm.publication} onChange={(e)=>setModelForm({...modelForm,publication:e.target.value as Publication})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"><option value="Haque Publication">Haque Publication</option><option value="Technical Publication">Technical Publication</option></select></label>
                  <label className="text-xs text-slate-300">লেখক<input maxLength={180} value={modelForm.author} onChange={(e)=>setModelForm({...modelForm,author:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">সংস্করণ<input maxLength={100} value={modelForm.edition} onChange={(e)=>setModelForm({...modelForm,edition:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">প্রবিধান *<input required value={modelForm.regulation} onChange={(e)=>setModelForm({...modelForm,regulation:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">টেকনোলজি কোড *<input required value={modelForm.technologyCode} onChange={(e)=>setModelForm({...modelForm,technologyCode:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" placeholder="85"/></label>
                  <label className="text-xs text-slate-300">ডিপার্টমেন্ট / টেকনোলজি *<input required value={modelForm.department} onChange={(e)=>setModelForm({...modelForm,department:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">সেমিস্টার *<select required value={modelForm.semester} onChange={(e)=>setModelForm({...modelForm,semester:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">{SEMESTERS.map((semester)=><option key={semester}>{semester}</option>)}</select></label>
                  <label className="text-xs text-slate-300 sm:col-span-2">মূল কভার ছবির লিংক<input type="url" value={modelForm.commonImageUrl} onChange={(e)=>setModelForm({...modelForm,commonImageUrl:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" placeholder="https://..."/></label>
                  <div className="sm:col-span-2 grid lg:grid-cols-2 gap-4">
                    <section className="rounded-2xl border border-orange-800 bg-orange-950/20 p-4 space-y-3">
                      <div><h4 className="font-bold text-orange-300">হক পাবলিকেশন্স বিবরণ</h4><p className="text-[11px] text-slate-400">haquepublications.com ক্যাটালগ ডাটা।</p></div>
                      <input type="url" value={modelForm.haqueCoverUrl} onChange={(e)=>setModelForm({...modelForm,haqueCoverUrl:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="কভার ছবির URL"/>
                      <input type="url" value={modelForm.haqueSourceUrl} onChange={(e)=>setModelForm({...modelForm,haqueSourceUrl:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="সোর্স প্রোডাক্ট URL"/>
                      <input value={modelForm.haqueAuthor} onChange={(e)=>setModelForm({...modelForm,haqueAuthor:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="প্রকাশনীর নির্দিষ্ট লেখক"/>
                      <div className="grid grid-cols-2 gap-2"><input value={modelForm.haqueEdition} onChange={(e)=>setModelForm({...modelForm,haqueEdition:e.target.value})} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="সংস্করণ"/><input type="number" min="0" value={modelForm.haqueReferencePrice} onChange={(e)=>setModelForm({...modelForm,haqueReferencePrice:e.target.value})} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="রেফারেন্স মূল্য"/></div>
                    </section>
                    <section className="rounded-2xl border border-sky-800 bg-sky-950/20 p-4 space-y-3">
                      <div><h4 className="font-bold text-sky-300">টেকনিক্যাল প্রকাশনী বিবরণ</h4><p className="text-[11px] text-slate-400">সোর্স ডাটা পাওয়া গেলে পূরণ করুন।</p></div>
                      <input type="url" value={modelForm.technicalCoverUrl} onChange={(e)=>setModelForm({...modelForm,technicalCoverUrl:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="কভার ছবির URL"/>
                      <input type="url" value={modelForm.technicalSourceUrl} onChange={(e)=>setModelForm({...modelForm,technicalSourceUrl:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="সোর্স প্রোডাক্ট URL"/>
                      <input value={modelForm.technicalAuthor} onChange={(e)=>setModelForm({...modelForm,technicalAuthor:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="প্রকাশনীর নির্দিষ্ট লেখক"/>
                      <div className="grid grid-cols-2 gap-2"><input value={modelForm.technicalEdition} onChange={(e)=>setModelForm({...modelForm,technicalEdition:e.target.value})} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="সংস্করণ"/><input type="number" min="0" value={modelForm.technicalReferencePrice} onChange={(e)=>setModelForm({...modelForm,technicalReferencePrice:e.target.value})} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="রেফারেন্স মূল্য"/></div>
                    </section>
                  </div>
                  <label className="text-xs text-slate-300">ISBN<input value={modelForm.isbn} onChange={(e)=>setModelForm({...modelForm,isbn:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">স্ট্যাটাস<select value={modelForm.status} onChange={(e)=>setModelForm({...modelForm,status:e.target.value as 'active'|'hidden'})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"><option value="active">Active (সক্রিয়)</option><option value="hidden">Hidden (লুকায়িত)</option></select></label>
                </div>
                <div className="rounded-xl bg-amber-950/30 border border-amber-800 p-3 text-xs text-amber-200">নির্বাচিত কারিকুলাম ম্যাপিং ডাটাবেজে যুক্ত বা আপডেট হবে। কোনো বিক্রেতার সক্রিয় অফার বা পছন্দের তালিকায় থাকলে মডেলটি স্থায়ীভাবে মোছা যাবে না।</div>
                <div className="flex justify-end gap-3"><button type="button" disabled={modelBusy} onClick={()=>setModelEditorOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-white">বাতিল</button><button type="submit" disabled={modelBusy} className="px-4 py-2 rounded-xl bg-[#ef4d23] text-white font-bold disabled:opacity-50">{modelBusy ? 'সংরক্ষণ হচ্ছে…' : modelForm.id ? 'পরিবর্তন সংরক্ষণ' : 'মডেল তৈরি করুন'}</button></div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LISTINGS MODERATION */}
      {activeAdminTab === 'listings' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-base text-white">
              মার্কেটপ্লেস লিস্টিং ব্যবস্থাপনা
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="লিস্টিং বা কোড দিয়ে খুঁজুন..."
                className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ef4d23]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <th className="py-3 px-2">বইয়ের নাম</th>
                  <th className="py-3 px-2">বিষয় কোড</th>
                  <th className="py-3 px-2">ডিপার্টমেন্ট</th>
                  <th className="py-3 px-2">অবস্থা</th>
                  <th className="py-3 px-2">মূল্য</th>
                  <th className="py-3 px-2">বিক্রেতা</th>
                  <th className="py-3 px-2">স্ট্যাটাস</th>
                  <th className="py-3 px-2 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredAdminListings.map((b) => (
                  <tr key={b.listingId ?? b.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-2 font-medium max-w-[220px] truncate">
                      {b.title}
                    </td>
                    <td className="py-3 px-2 font-mono font-bold text-[#ef4d23]">
                      {b.subjectCode}
                    </td>
                    <td className="py-3 px-2 text-slate-400">{b.department}</td>
                    <td className="py-3 px-2">{b.condition}</td>
                    <td className="py-3 px-2 font-bold">৳{b.sellingPrice}</td>
                    <td className="py-3 px-2 text-slate-300">{b.seller.name}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          b.availability === 'Available'
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {b.availability === 'Available' ? 'সক্রিয়' : b.availability === 'Sold' ? 'বিক্রিত' : b.availability === 'Reserved' ? 'সংরক্ষিত' : 'নিষ্ক্রিয়'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right space-x-2">
                      <button
                        onClick={() => navigateToBook(b.id)}
                        className="text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        দেখুন
                      </button>
                      <button
                        onClick={() => {
                          if (b.availability === 'Available' || b.availability === 'Inactive') {
                            void updateBookStatus(
                              b.listingId ?? b.id,
                              b.availability === 'Available' ? 'Inactive' : 'Available'
                            ).catch((error) => setAdminActionMessage(
                              error instanceof Error ? error.message : 'লিস্টিং আপডেট করা যায়নি।'
                            ));
                          }
                        }}
                        disabled={b.availability === 'Sold' || b.availability === 'Reserved'}
                        className="text-amber-400 hover:text-amber-300 cursor-pointer"
                      >
                        {b.availability === 'Available' ? 'স্থগিত' : b.availability === 'Inactive' ? 'সক্রিয়' : 'লকড'}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('এই লিস্টিংটি স্থায়ীভাবে মুছে ফেলতে চান?')) {
                            void deleteBookListing(b.listingId ?? b.id).catch((error) => setAdminActionMessage(
                              error instanceof Error ? error.message : 'লিস্টিংটি মোছা যায়নি।'
                            ));
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        মুছুন
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS & PICKUPS */}
      {activeAdminTab === 'orders' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <h3 className="font-bold text-base text-white">
            অর্ডার ও ক্যাম্পাস পিকআপ পয়েন্ট লজিস্টিকস
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <th className="py-3 px-2">অর্ডার নং</th>
                  <th className="py-3 px-2">বই</th>
                  <th className="py-3 px-2">ক্রেতা</th>
                  <th className="py-3 px-2">বিক্রেতা</th>
                  <th className="py-3 px-2">পিকআপ স্টেশন</th>
                  <th className="py-3 px-2">এসক্রো পিন</th>
                  <th className="py-3 px-2">মূল্য</th>
                  <th className="py-3 px-2">অর্ডার স্ট্যাটাস</th>
                  <th className="py-3 px-2 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-2 font-mono font-bold text-white">
                      #{ord.orderNumber}
                    </td>
                    <td className="py-3 px-2 max-w-[180px] truncate">
                      {ord.book.title}
                    </td>
                    <td className="py-3 px-2 text-slate-300">{ord.buyer.name}</td>
                    <td className="py-3 px-2 text-slate-300">{ord.seller.name}</td>
                    <td className="py-3 px-2 text-slate-400">
                      {ord.pickupPoint.name}
                    </td>
                    <td className="py-3 px-2 font-mono font-bold text-amber-400">
                      {ord.verificationPin}
                    </td>
                    <td className="py-3 px-2 font-bold text-emerald-400">
                      ৳{ord.price}
                    </td>
                    <td className="py-3 px-2">
                      <StatusBadge status={ord.status} size="sm" />
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => navigateToOrder(ord.id)}
                        className="text-[#ef4d23] hover:underline cursor-pointer"
                      >
                        তদারকি
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DISPUTES */}
      {activeAdminTab === 'disputes' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <h3 className="font-bold text-base text-white">
            চলমান শিক্ষার্থী বিরোধ ও এসক্রো স্থগিতাদেশ
          </h3>

          <div className="space-y-3">
            {disputes.map((dsp) => (
              <div
                key={dsp.id}
                className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#ef4d23]">
                      {dsp.orderNumber}
                    </span>
                    <span className="font-bold text-white text-sm">
                      {dsp.reason}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        dsp.status === 'Resolved'
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {dsp.status === 'Resolved' ? 'মীমাংসিত' : 'অপেক্ষমাণ'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    বই: <strong>{dsp.bookTitle}</strong> • অভিযোগকারী: {dsp.reportedBy} ({dsp.date})
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    "{dsp.details}"
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {dsp.status !== 'Resolved' ? (
                    <>
                      <button
                        onClick={() => {
                          void resolveDispute(dsp.id, 'Under Review').catch((error) =>
                            setAdminActionMessage(
                              error instanceof Error
                                ? error.message
                                : 'বিরোধের স্ট্যাটাস আপডেট করা যায়নি।'
                            )
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        পর্যালোচনাধীন রাখুন
                      </button>
                      <button
                        onClick={() => {
                          void resolveDispute(dsp.id, 'Resolved').catch((error) =>
                            setAdminActionMessage(
                              error instanceof Error
                                ? error.message
                                : 'বিরোধ নিষ্পত্তি করা যায়নি।'
                            )
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        মীমাংসা ও রিফান্ড প্রদান
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      ক্যাম্পাস অপস কর্তৃক মীমাংসিত
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: STUDENT ID VERIFICATION QUEUE */}
      {activeAdminTab === 'verification' && (
        <div className="space-y-4">
          {adminActionMessage && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{adminActionMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
                পর্যালোচনার অপেক্ষায়
              </span>
              <p className="text-2xl font-bold text-white mt-1">{pendingVerifications}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block">
                অনুমোদিত
              </span>
              <p className="text-2xl font-bold text-white mt-1">
                {verificationQueue.filter((v) => v.status === 'approved').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 block">
                বাতিলকৃত
              </span>
              <p className="text-2xl font-bold text-white mt-1">
                {verificationQueue.filter((v) => v.status === 'rejected').length}
              </p>
            </div>
          </div>

          {verificationQueue.length === 0 ? (
            <div className="p-10 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <IdCard className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">এখনো কোনো আইডি যাচাইয়ের আবেদন জমা পড়েনি</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                কোনো শিক্ষার্থী তাদের বিটিইবি রোল, রেজিস্ট্রেশন ও আইডি কার্ডের ছবি জমা দিলে তা এখানে ক্যাম্পাস ডেস্কের পর্যালোচনার জন্য আসবে।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {verificationQueue.map((req) => {
                const statusStyle =
                  req.status === 'approved'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : req.status === 'rejected'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/40';

                return (
                  <div
                    key={req.id}
                    className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#ef4d23]/20 text-[#ef4d23] flex items-center justify-center shrink-0">
                          <IdCard className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{req.userName || 'শিক্ষার্থী'}</p>
                          <p className="text-[11px] text-slate-400">
                            {req.userInstitute} • {req.userDepartment} ({req.userSemester})
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border self-start ${statusStyle}`}>
                        {req.status === 'approved' ? 'অনুমোদিত' : req.status === 'rejected' ? 'বাতিল' : 'অপেক্ষমাণ'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">বিটিইবি রোল</span>
                        <span className="font-mono font-semibold text-white">{req.studentRoll}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">রেজিস্ট্রেশন নং</span>
                        <span className="font-mono font-semibold text-white">{req.studentRegNo || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">জমার তারিখ</span>
                        <span className="text-slate-200">{req.createdAt}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">আইডি কার্ড</span>
                        {req.idCardPath ? (
                          <button
                            onClick={() => handleViewIdCard(req.idCardPath)}
                            disabled={idCardLoading === req.idCardPath}
                            className="inline-flex items-center gap-1 text-[#ef4d23] hover:underline font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {idCardLoading === req.idCardPath ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ExternalLink className="w-3 h-3" />
                            )}
                            <span>ছবি দেখুন</span>
                          </button>
                        ) : (
                          <span className="text-slate-500">সংযুক্ত নয়</span>
                        )}
                      </div>
                    </div>

                    {req.adminNote && req.status !== 'pending' && (
                      <p className="text-[11px] text-slate-400">
                        পূর্বের মন্তব্য: <span className="text-slate-300">{req.adminNote}</span>
                      </p>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">
                        পর্যালোচকের মন্তব্য (বাতিল হলে শিক্ষার্থীকে জানানো হবে)
                      </label>
                      <input
                        type="text"
                        value={adminNotes[req.id] ?? ''}
                        onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="যেমন: ছবি অস্পষ্ট — অনুগ্রহ করে স্পষ্ট ছবি আপলোড করুন"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleVerificationDecision(req.id, 'approved')}
                        disabled={verificationBusy === req.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {verificationBusy === req.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <BadgeCheck className="w-3.5 h-3.5" />
                        )}
                        <span>{req.status === 'approved' ? 'পুনরায় অনুমোদন ও যাচাই' : 'অনুমোদন ও যাচাই'}</span>
                      </button>
                      <button
                        onClick={() => handleVerificationDecision(req.id, 'rejected')}
                        disabled={verificationBusy === req.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>বাতিল করুন</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
                Polytechnic Marketplace Ops & Admin
              </h1>
              <span className="text-[10px] uppercase font-mono tracking-widest bg-[#ef4d23]/20 text-[#ef4d23] px-2 py-0.5 rounded border border-[#ef4d23]/40">
                Staff Desk
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Campus pickup station logistics, dispute resolution, and escrow accounting
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveView('home')}
          className="flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full border border-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Student Marketplace</span>
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
          Operations Overview
        </button>
        <button onClick={() => setActiveAdminTab('models')} className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer ${activeAdminTab === 'models' ? 'bg-[#ef4d23] text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}>
          Book Models ({books.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('listings')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeAdminTab === 'listings'
              ? 'bg-[#ef4d23] text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Listing Moderation ({totalListings})
        </button>
        <button
          onClick={() => setActiveAdminTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeAdminTab === 'orders'
              ? 'bg-[#ef4d23] text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Orders & Pickup Escrow ({orders.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('disputes')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeAdminTab === 'disputes'
              ? 'bg-[#ef4d23] text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>Disputes & Reports</span>
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
          <span>Student Verification</span>
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
                Active Listings
              </span>
              <p className="text-2xl font-bold text-white mt-1">
                {activeListings}
              </p>
              <span className="text-[11px] text-slate-500">
                of {totalListings} total listed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Total Orders
              </span>
              <p className="text-2xl font-bold text-sky-400 mt-1">
                {totalOrders}
              </p>
              <span className="text-[11px] text-slate-500">
                {completedOrders} completed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Pending Drop-offs
              </span>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {pendingDropoffs}
              </p>
              <span className="text-[11px] text-slate-500">awaiting seller</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Pending Pickups
              </span>
              <p className="text-2xl font-bold text-[#ef4d23] mt-1">
                {pendingPickups}
              </p>
              <span className="text-[11px] text-slate-500">at campus desk</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Escrow Volume
              </span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                ৳{totalEscrowVolume}
              </p>
              <span className="text-[11px] text-slate-500">
                ৳{pendingPayouts} in escrow
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
                  <span>Recent Campus Transactions</span>
                </h3>
                <button
                  onClick={() => setActiveAdminTab('orders')}
                  className="text-xs text-[#ef4d23] hover:underline cursor-pointer"
                >
                  View all
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
                        PIN: <span className="font-mono text-[#ef4d23]">{ord.verificationPin}</span>
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
                  <span>Student Dispute Queue</span>
                </h3>
                <button
                  onClick={() => setActiveAdminTab('disputes')}
                  className="text-xs text-[#ef4d23] hover:underline cursor-pointer"
                >
                  View all
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
                      {dsp.status}
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
              <div><h3 className="font-bold text-white">Book Model Manager</h3><p className="text-xs text-slate-400">Create, edit, hide or safely delete database-backed catalog models.</p></div>
              <div className="flex items-center gap-2">
                <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={adminSearch} onChange={(event)=>setAdminSearch(event.target.value)} placeholder="Search models..." className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white"/></div>
                <button onClick={openCreateModel} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ef4d23] text-white text-xs font-bold"><Plus className="w-4 h-4"/>Add model</button>
              </div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-400 border-b border-slate-800"><th className="py-3">Book model</th><th>Code</th><th>Publication</th><th>Status</th><th>Offers</th><th>From</th><th className="text-right">Actions</th></tr></thead><tbody>{filteredModels.map((b)=><tr key={b.id} className="border-b border-slate-800"><td className="py-3"><b className="text-white">{b.title}</b><div className="text-slate-500">{b.department} • {b.semester}</div></td><td className="text-[#ef4d23] font-mono">{b.subjectCode}</td><td><span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${b.publication==='Technical Publication'?'bg-sky-950 text-sky-300 border-sky-800':'bg-orange-950 text-orange-300 border-orange-800'}`}>{b.publication || 'Haque Publication'}</span></td><td><span className={`px-2 py-1 rounded-full ${b.status==='hidden'?'bg-slate-800 text-slate-400':'bg-emerald-950 text-emerald-300'}`}>{b.status || 'active'}</span></td><td>{b.sellerCount ?? 0}</td><td>{b.lowestPrice ? `৳${b.lowestPrice}` : '—'}</td><td className="text-right"><div className="flex justify-end gap-3"><button onClick={()=>navigateToBook(b.id)} title="View" className="text-sky-400"><Eye className="w-4 h-4"/></button><button onClick={()=>void openEditModel(b)} title="Edit" className="text-amber-400"><Pencil className="w-4 h-4"/></button><button onClick={()=>void toggleModelStatus(b)} title={b.status==='hidden'?'Activate':'Hide'} className="text-violet-400">{b.status==='hidden'?<Eye className="w-4 h-4"/>:<EyeOff className="w-4 h-4"/>}</button><button onClick={()=>void deleteBookModel(b)} disabled={modelBusy} title="Delete unused model" className="text-rose-400 disabled:opacity-40"><Trash2 className="w-4 h-4"/></button></div></td></tr>)}</tbody></table></div>
          </div>

          {modelEditorOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!modelBusy)setModelEditorOpen(false);}}>
              <form onSubmit={saveBookModel} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-5">
                <div className="flex justify-between items-start"><div><h3 className="text-lg font-bold text-white">{modelForm.id?'Edit book model':'Add book model'}</h3><p className="text-xs text-slate-400">Changes are written directly to Supabase through an admin-only function.</p></div><button type="button" disabled={modelBusy} onClick={()=>setModelEditorOpen(false)} className="text-slate-400"><X className="w-5 h-5"/></button></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="text-xs text-slate-300 sm:col-span-2">Book title *<input required maxLength={180} value={modelForm.title} onChange={(e)=>setModelForm({...modelForm,title:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">Subject code *<input required maxLength={40} value={modelForm.subjectCode} onChange={(e)=>setModelForm({...modelForm,subjectCode:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-mono"/></label>
                  <label className="text-xs text-slate-300">Subject name<input maxLength={180} value={modelForm.subjectName} onChange={(e)=>setModelForm({...modelForm,subjectName:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">Default publication *<select value={modelForm.publication} onChange={(e)=>setModelForm({...modelForm,publication:e.target.value as Publication})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"><option value="Haque Publication">Haque Publication</option><option value="Technical Publication">Technical Publication</option></select></label>
                  <label className="text-xs text-slate-300">Author<input maxLength={180} value={modelForm.author} onChange={(e)=>setModelForm({...modelForm,author:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">Edition<input maxLength={100} value={modelForm.edition} onChange={(e)=>setModelForm({...modelForm,edition:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">Regulation *<input required value={modelForm.regulation} onChange={(e)=>setModelForm({...modelForm,regulation:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">Technology code *<input required value={modelForm.technologyCode} onChange={(e)=>setModelForm({...modelForm,technologyCode:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" placeholder="85"/></label>
                  <label className="text-xs text-slate-300">Department / Technology *<input required value={modelForm.department} onChange={(e)=>setModelForm({...modelForm,department:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">Semester *<select required value={modelForm.semester} onChange={(e)=>setModelForm({...modelForm,semester:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">{SEMESTERS.map((semester)=><option key={semester}>{semester}</option>)}</select></label>
                  <label className="text-xs text-slate-300 sm:col-span-2">Common cover URL<input type="url" value={modelForm.commonImageUrl} onChange={(e)=>setModelForm({...modelForm,commonImageUrl:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" placeholder="https://..."/></label>
                  <div className="sm:col-span-2 grid lg:grid-cols-2 gap-4">
                    <section className="rounded-2xl border border-orange-800 bg-orange-950/20 p-4 space-y-3">
                      <div><h4 className="font-bold text-orange-300">Haque Publication details</h4><p className="text-[11px] text-slate-400">Ready for haquepublications.com catalog data.</p></div>
                      <input type="url" value={modelForm.haqueCoverUrl} onChange={(e)=>setModelForm({...modelForm,haqueCoverUrl:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="Cover image URL"/>
                      <input type="url" value={modelForm.haqueSourceUrl} onChange={(e)=>setModelForm({...modelForm,haqueSourceUrl:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="Source product URL"/>
                      <input value={modelForm.haqueAuthor} onChange={(e)=>setModelForm({...modelForm,haqueAuthor:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="Publication-specific author"/>
                      <div className="grid grid-cols-2 gap-2"><input value={modelForm.haqueEdition} onChange={(e)=>setModelForm({...modelForm,haqueEdition:e.target.value})} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="Edition"/><input type="number" min="0" value={modelForm.haqueReferencePrice} onChange={(e)=>setModelForm({...modelForm,haqueReferencePrice:e.target.value})} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="Reference price"/></div>
                    </section>
                    <section className="rounded-2xl border border-sky-800 bg-sky-950/20 p-4 space-y-3">
                      <div><h4 className="font-bold text-sky-300">Technical Publication details</h4><p className="text-[11px] text-slate-400">Structure is ready; leave empty until a source is available.</p></div>
                      <input type="url" value={modelForm.technicalCoverUrl} onChange={(e)=>setModelForm({...modelForm,technicalCoverUrl:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="Cover image URL"/>
                      <input type="url" value={modelForm.technicalSourceUrl} onChange={(e)=>setModelForm({...modelForm,technicalSourceUrl:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="Source product URL"/>
                      <input value={modelForm.technicalAuthor} onChange={(e)=>setModelForm({...modelForm,technicalAuthor:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="Publication-specific author"/>
                      <div className="grid grid-cols-2 gap-2"><input value={modelForm.technicalEdition} onChange={(e)=>setModelForm({...modelForm,technicalEdition:e.target.value})} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="Edition"/><input type="number" min="0" value={modelForm.technicalReferencePrice} onChange={(e)=>setModelForm({...modelForm,technicalReferencePrice:e.target.value})} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs" placeholder="Reference price"/></div>
                    </section>
                  </div>
                  <label className="text-xs text-slate-300">ISBN<input value={modelForm.isbn} onChange={(e)=>setModelForm({...modelForm,isbn:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"/></label>
                  <label className="text-xs text-slate-300">Status<select value={modelForm.status} onChange={(e)=>setModelForm({...modelForm,status:e.target.value as 'active'|'hidden'})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white"><option value="active">Active</option><option value="hidden">Hidden</option></select></label>
                </div>
                <div className="rounded-xl bg-amber-950/30 border border-amber-800 p-3 text-xs text-amber-200">Editing adds or updates the selected curriculum mapping; existing shared mappings are preserved. Permanent delete is blocked when seller listings or wishlists reference the model.</div>
                <div className="flex justify-end gap-3"><button type="button" disabled={modelBusy} onClick={()=>setModelEditorOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-white">Cancel</button><button type="submit" disabled={modelBusy} className="px-4 py-2 rounded-xl bg-[#ef4d23] text-white font-bold disabled:opacity-50">{modelBusy?'Saving…':modelForm.id?'Save changes':'Create model'}</button></div>
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
              Marketplace Listings Management
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Search listings or codes..."
                className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ef4d23]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <th className="py-3 px-2">Book Title</th>
                  <th className="py-3 px-2">Subject Code</th>
                  <th className="py-3 px-2">Department</th>
                  <th className="py-3 px-2">Condition</th>
                  <th className="py-3 px-2">Price</th>
                  <th className="py-3 px-2">Seller</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Actions</th>
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
                        {b.availability}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right space-x-2">
                      <button
                        onClick={() => navigateToBook(b.id)}
                        className="text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          if (b.availability === 'Available' || b.availability === 'Inactive') {
                            void updateBookStatus(
                              b.listingId ?? b.id,
                              b.availability === 'Available' ? 'Inactive' : 'Available'
                            ).catch((error) => setAdminActionMessage(
                              error instanceof Error ? error.message : 'Could not update listing.'
                            ));
                          }
                        }}
                        disabled={b.availability === 'Sold' || b.availability === 'Reserved'}
                        className="text-amber-400 hover:text-amber-300 cursor-pointer"
                      >
                        {b.availability === 'Available' ? 'Pause' : b.availability === 'Inactive' ? 'Activate' : 'Locked'}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this listing permanently?')) {
                            void deleteBookListing(b.listingId ?? b.id).catch((error) => setAdminActionMessage(
                              error instanceof Error ? error.message : 'Could not delete listing.'
                            ));
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        Delete
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
            Orders & Campus Pickup Point Logistics
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <th className="py-3 px-2">Order #</th>
                  <th className="py-3 px-2">Book</th>
                  <th className="py-3 px-2">Buyer</th>
                  <th className="py-3 px-2">Seller</th>
                  <th className="py-3 px-2">Pickup Station</th>
                  <th className="py-3 px-2">Escrow PIN</th>
                  <th className="py-3 px-2">Amount</th>
                  <th className="py-3 px-2">Order Status</th>
                  <th className="py-3 px-2 text-right">Action</th>
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
                        Inspect
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
            Open Student Disputes & Escrow Holds
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
                      {dsp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Book: <strong>{dsp.bookTitle}</strong> • Reported by: {dsp.reportedBy} ({dsp.date})
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
                                : 'Could not update dispute.'
                            )
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Set In-Review
                      </button>
                      <button
                        onClick={() => {
                          void resolveDispute(dsp.id, 'Resolved').catch((error) =>
                            setAdminActionMessage(
                              error instanceof Error
                                ? error.message
                                : 'Could not resolve dispute.'
                            )
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Resolve & Refund Buyer
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Resolved by Campus Ops
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
                Pending Review
              </span>
              <p className="text-2xl font-bold text-white mt-1">{pendingVerifications}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block">
                Approved
              </span>
              <p className="text-2xl font-bold text-white mt-1">
                {verificationQueue.filter((v) => v.status === 'approved').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 block">
                Rejected
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
              <h3 className="text-sm font-bold text-white">No student ID submissions yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When a student submits their BTEB roll, registration number and ID card photo, the
                request appears here for campus desk review.
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
                          <p className="text-sm font-bold text-white">{req.userName || 'Student'}</p>
                          <p className="text-[11px] text-slate-400">
                            {req.userInstitute} • {req.userDepartment} ({req.userSemester})
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border self-start ${statusStyle}`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">BTEB Roll</span>
                        <span className="font-mono font-semibold text-white">{req.studentRoll}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Registration No</span>
                        <span className="font-mono font-semibold text-white">{req.studentRegNo || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Submitted</span>
                        <span className="text-slate-200">{req.createdAt}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">ID Card</span>
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
                            <span>Open photo</span>
                          </button>
                        ) : (
                          <span className="text-slate-500">Not attached</span>
                        )}
                      </div>
                    </div>

                    {req.adminNote && req.status !== 'pending' && (
                      <p className="text-[11px] text-slate-400">
                        Previous note: <span className="text-slate-300">{req.adminNote}</span>
                      </p>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">
                        Reviewer note (sent to the student on rejection)
                      </label>
                      <input
                        type="text"
                        value={adminNotes[req.id] ?? ''}
                        onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="e.g. Photo is blurry — please re-upload"
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
                        <span>{req.status === 'approved' ? 'Re-approve & Verify' : 'Approve & Verify'}</span>
                      </button>
                      <button
                        onClick={() => handleVerificationDecision(req.id, 'rejected')}
                        disabled={verificationBusy === req.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
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

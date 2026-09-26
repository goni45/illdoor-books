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
  Smartphone,
  Sparkles,
  Save,
  RotateCcw,
  Trophy,
  Moon,
  Clock,
  Bell,
} from 'lucide-react';
import {
  getDayPrayerSchedule,
  isReminderEnabled,
  setReminderEnabled,
  formatBengaliTime,
  PrayerName,
} from '../lib/prayerTimes';
import { useMarketplace } from '../context/MarketplaceContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { supabase } from '../lib/supabase';
import {
  getTipJarSettings,
  saveTipJarSettings,
  DEFAULT_TIP_JAR_SETTINGS,
  DEFAULT_LEADERBOARD_ENTRIES,
  TipJarSettings,
  TipJarLeaderboardEntry,
} from '../lib/tipJarStorage';
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
    'overview' | 'models' | 'listings' | 'orders' | 'disputes' | 'verification' | 'tipjar' | 'namaz'
  >('overview');

  const [namazEnabled, setNamazEnabled] = useState<boolean>(isReminderEnabled);
  const prayerSchedule = getDayPrayerSchedule();

  const [tipJarConfig, setTipJarConfig] = useState<TipJarSettings>(getTipJarSettings);
  const [tipJarSavedMessage, setTipJarSavedMessage] = useState<string | null>(null);

  // Leaderboard manager state
  const [newDonorName, setNewDonorName] = useState('');
  const [newDonorAmount, setNewDonorAmount] = useState('');
  const [newDonorMessage, setNewDonorMessage] = useState('');
  const [newDonorTimeAgo, setNewDonorTimeAgo] = useState('Just now');

  const handleAddDonor = () => {
    if (!newDonorName.trim() || !newDonorAmount) return;
    const newEntry: TipJarLeaderboardEntry = {
      id: Date.now().toString(),
      name: newDonorName.trim(),
      amount: Number(newDonorAmount) || 0,
      message: newDonorMessage.trim() || undefined,
      timeAgo: newDonorTimeAgo.trim() || 'Just now',
    };
    setTipJarConfig((prev) => ({
      ...prev,
      leaderboard: [newEntry, ...(prev.leaderboard || [])],
    }));
    setNewDonorName('');
    setNewDonorAmount('');
    setNewDonorMessage('');
    setNewDonorTimeAgo('Just now');
  };

  const handleRemoveDonor = (id: string) => {
    setTipJarConfig((prev) => ({
      ...prev,
      leaderboard: (prev.leaderboard || []).filter((d) => d.id !== id),
    }));
  };

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

        <button
          onClick={() => {
            setActiveAdminTab('tipjar');
            setTipJarSavedMessage(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeAdminTab === 'tipjar'
              ? 'bg-[#ef4d23] text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>📱 iPhone ফান্ড সেটিংস</span>
          {tipJarConfig.enabled ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          ) : (
            <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.2 rounded">বন্ধ</span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('namaz')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeAdminTab === 'namaz'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>🕌 নামাজ রিমাইন্ডার</span>
          {namazEnabled ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          ) : (
            <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.2 rounded">বন্ধ</span>
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

      {/* TAB 7: TIP JAR / IPHONE FUND SETTINGS */}
      {activeAdminTab === 'tipjar' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <h2 className="text-lg font-bold text-white">
                  "Help me to buy a new iPhone" উইজেট ও পেমেন্ট সেটিংস
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                শিক্ষার্থীদের স্ক্রিনে প্রদর্শিত ফ্লোটিং উইজেট, মিম ছবি এবং বিকাশ, নগদ ও রকেট সেন্ড মানি নম্বর পরিবর্তন করুন।
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('আপনি কি সব সেটিংস ডিফল্টে রিসেট করতে চান?')) {
                    setTipJarConfig(DEFAULT_TIP_JAR_SETTINGS);
                    saveTipJarSettings(DEFAULT_TIP_JAR_SETTINGS);
                    setTipJarSavedMessage('সেটিংস ডিফল্টে রিসেট করা হয়েছে!');
                    setTimeout(() => setTipJarSavedMessage(null), 3000);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>রিসেট</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  saveTipJarSettings(tipJarConfig);
                  setTipJarSavedMessage('✓ সফলভাবে সংরক্ষিত ও ওয়েবসাইটে লাইভ আপডেট হয়েছে!');
                  setTimeout(() => setTipJarSavedMessage(null), 3500);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#ef4d23] hover:bg-[#de3d13] text-white shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>

          {tipJarSavedMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{tipJarSavedMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form inputs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card 1: Visibility & Branding */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      উইজেট সক্রিয়করণ ও বিবরণ
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      ওয়েবসাইটের নিচে ভাসমান বোতামটি চালু বা বন্ধ রাখুন
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tipJarConfig.enabled}
                      onChange={(e) =>
                        setTipJarConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ef4d23]"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      ভাসমান বোতামের লেখা (Button Text)
                    </label>
                    <input
                      type="text"
                      value={tipJarConfig.buttonText}
                      onChange={(e) =>
                        setTipJarConfig((prev) => ({ ...prev, buttonText: e.target.value }))
                      }
                      placeholder="Help me to buy a new iPhone"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      পপ-আপের শিরোনাম (Modal Title)
                    </label>
                    <input
                      type="text"
                      value={tipJarConfig.title}
                      onChange={(e) =>
                        setTipJarConfig((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Help me to buy a new iPhone plsssssssss"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    মিম ছবির ডিরেক্ট লিংক (Meme Image URL)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={tipJarConfig.imageUrl}
                      onChange={(e) =>
                        setTipJarConfig((prev) => ({ ...prev, imageUrl: e.target.value }))
                      }
                      placeholder="https://... বা /iphone-fund-meme.jpg"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setTipJarConfig((prev) => ({
                          ...prev,
                          imageUrl: 'https://images.meme-arsenal.com/6105c3761e035663ba81e5667a46ee4d.jpg',
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 whitespace-nowrap cursor-pointer"
                    >
                      আসল লিংক দিন
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTipJarConfig((prev) => ({
                          ...prev,
                          imageUrl: '/iphone-fund-meme.jpg',
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 whitespace-nowrap cursor-pointer"
                    >
                      লোকাল ব্যাকআপ দিন
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    এখানে যেকোনো ইমেজ URL দিলে তা স্বয়ংক্রিয়ভাবে উইজেট ও পপ-আপের মিম হিসেবে সেট হয়ে যাবে।
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    পপ-আপের বার্তা / সাবটাইটেল (Subtitle)
                  </label>
                  <textarea
                    rows={2}
                    value={tipJarConfig.subtitle}
                    onChange={(e) =>
                      setTipJarConfig((prev) => ({ ...prev, subtitle: e.target.value }))
                    }
                    placeholder="আমার না আপনার কাছ থেকে একটা iPhone পেতে ইচ্ছে করছে... আমাকে একটা iPhone কিনতে সাহায্য করবেন? 🥺👉👈"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                  />
                </div>
              </div>

              {/* Card 2: Send Money Accounts (bKash, Nagad, Rocket) */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#ef4d23]" />
                    সেন্ড মানি অ্যাকাউন্টসমূহ (Send Money Accounts)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    এখানে যে নম্বরগুলো দেবেন শিক্ষার্থীরা এক ক্লিকে কপি করে টাকা পাঠাতে পারবে
                  </p>
                </div>

                {/* 1. bKash */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#e2136e]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e2136e]" />
                    <span>bKash (বিকাশ) একাউন্ট</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">বিকাশ মোবাইল নম্বর</label>
                      <input
                        type="text"
                        value={tipJarConfig.bkashNumber}
                        onChange={(e) =>
                          setTipJarConfig((prev) => ({ ...prev, bkashNumber: e.target.value }))
                        }
                        placeholder="01XXXXXXXXX"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">একাউন্টের ধরন / লেবেল</label>
                      <input
                        type="text"
                        value={tipJarConfig.bkashType}
                        onChange={(e) =>
                          setTipJarConfig((prev) => ({ ...prev, bkashType: e.target.value }))
                        }
                        placeholder="Personal (Send Money)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Nagad */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#f7941d]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f7941d]" />
                    <span>Nagad (নগদ) একাউন্ট</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">নগদ মোবাইল নম্বর</label>
                      <input
                        type="text"
                        value={tipJarConfig.nagadNumber}
                        onChange={(e) =>
                          setTipJarConfig((prev) => ({ ...prev, nagadNumber: e.target.value }))
                        }
                        placeholder="01XXXXXXXXX"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">একাউন্টের ধরন / লেবেল</label>
                      <input
                        type="text"
                        value={tipJarConfig.nagadType}
                        onChange={(e) =>
                          setTipJarConfig((prev) => ({ ...prev, nagadType: e.target.value }))
                        }
                        placeholder="Personal (Send Money)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Rocket */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#a755b0]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8c3494]" />
                    <span>Rocket (রকেট) একাউন্ট</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">রকেট মোবাইল নম্বর</label>
                      <input
                        type="text"
                        value={tipJarConfig.rocketNumber}
                        onChange={(e) =>
                          setTipJarConfig((prev) => ({ ...prev, rocketNumber: e.target.value }))
                        }
                        placeholder="01XXXXXXXXX"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">একাউন্টের ধরন / লেবেল</label>
                      <input
                        type="text"
                        value={tipJarConfig.rocketType}
                        onChange={(e) =>
                          setTipJarConfig((prev) => ({ ...prev, rocketType: e.target.value }))
                        }
                        placeholder="Personal (Send Money)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Target, Raised & Note */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    টার্গেট ও ধন্যবাদ নোট
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    iPhone কেনার মোট বাজেট ও শিক্ষার্থীদের জন্য নির্দেশনা বার্তা
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      টার্গেট এমাউন্ট (টাকা)
                    </label>
                    <input
                      type="number"
                      value={tipJarConfig.targetAmount}
                      onChange={(e) =>
                        setTipJarConfig((prev) => ({
                          ...prev,
                          targetAmount: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      সংগৃহীত এমাউন্ট (টাকা)
                    </label>
                    <input
                      type="number"
                      value={tipJarConfig.collectedAmount}
                      onChange={(e) =>
                        setTipJarConfig((prev) => ({
                          ...prev,
                          collectedAmount: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    ধন্যবাদ / রেফারেন্স নির্দেশিকা নোট
                  </label>
                  <textarea
                    rows={2}
                    value={tipJarConfig.note}
                    onChange={(e) =>
                      setTipJarConfig((prev) => ({ ...prev, note: e.target.value }))
                    }
                    placeholder="টাকা পাঠানোর পর রেফারেন্সে আপনার নাম বা রোল নম্বর লিখে দিতে পারেন..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                  />
                </div>
              </div>

              {/* Card 4: Leaderboard Management */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      লিডারবোর্ড ও সাম্প্রতিক সহায়তা (Donors Leaderboard)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      যেমন: "Mahi just sent 200 taka" — এখান থেকে যেকোনো নাম, টাকা ও মেসেজ এডিট/যোগ/মুছতে পারবেন
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tipJarConfig.showLeaderboard !== false}
                      onChange={(e) =>
                        setTipJarConfig((prev) => ({ ...prev, showLeaderboard: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ef4d23]"></div>
                  </label>
                </div>

                {/* Add new donor form */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    নতুন ডোনার যোগ করুন
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={newDonorName}
                      onChange={(e) => setNewDonorName(e.target.value)}
                      placeholder="নাম (যেমন: Mahi)"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                    />
                    <input
                      type="number"
                      value={newDonorAmount}
                      onChange={(e) => setNewDonorAmount(e.target.value)}
                      placeholder="টাকা (যেমন: 200)"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                    />
                    <input
                      type="text"
                      value={newDonorTimeAgo}
                      onChange={(e) => setNewDonorTimeAgo(e.target.value)}
                      placeholder="সময় (যেমন: Just now)"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDonorMessage}
                      onChange={(e) => setNewDonorMessage(e.target.value)}
                      placeholder="ছোট্ট মেসেজ বা শুভেচ্ছা (ঐচ্ছিক)"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ef4d23]"
                    />
                    <button
                      type="button"
                      onClick={handleAddDonor}
                      disabled={!newDonorName.trim() || !newDonorAmount}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>যুক্ত করুন</span>
                    </button>
                  </div>
                </div>

                {/* List of current donors with instant in-line editing */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>বর্তমান ডোনার তালিকা ({tipJarConfig.leaderboard?.length || 0}):</span>
                    <button
                      type="button"
                      onClick={() =>
                        setTipJarConfig((prev) => ({
                          ...prev,
                          leaderboard: DEFAULT_LEADERBOARD_ENTRIES,
                        }))
                      }
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                    >
                      ডিফল্ট ডোনার রিস্টোর করুন
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {(tipJarConfig.leaderboard || []).map((donor, idx) => (
                      <div
                        key={donor.id || idx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center font-bold text-[10px] shrink-0">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={donor.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTipJarConfig((prev) => ({
                                ...prev,
                                leaderboard: (prev.leaderboard || []).map((d) =>
                                  d.id === donor.id ? { ...d, name: val } : d
                                ),
                              }));
                            }}
                            placeholder="ডোনার নাম"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-semibold focus:outline-none focus:border-[#ef4d23]"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={donor.amount}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setTipJarConfig((prev) => ({
                                  ...prev,
                                  leaderboard: (prev.leaderboard || []).map((d) =>
                                    d.id === donor.id ? { ...d, amount: val } : d
                                  ),
                                }));
                              }}
                              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-400 font-mono font-bold text-xs focus:outline-none focus:border-[#ef4d23]"
                            />
                            <span className="text-slate-400 text-[11px]">৳</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDonor(donor.id)}
                            title="মুছে ফেলুন"
                            className="p-1 rounded text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={donor.message || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTipJarConfig((prev) => ({
                                ...prev,
                                leaderboard: (prev.leaderboard || []).map((d) =>
                                  d.id === donor.id ? { ...d, message: val } : d
                                ),
                              }));
                            }}
                            placeholder="মেসেজ / শুভেচ্ছা"
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-[11px] focus:outline-none focus:border-[#ef4d23]"
                          />
                          <input
                            type="text"
                            value={donor.timeAgo || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTipJarConfig((prev) => ({
                                ...prev,
                                leaderboard: (prev.leaderboard || []).map((d) =>
                                  d.id === donor.id ? { ...d, timeAgo: val } : d
                                ),
                              }));
                            }}
                            placeholder="সময় (যেমন: Just now)"
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-400 text-[11px] focus:outline-none focus:border-[#ef4d23]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Live Preview */}
            <div className="space-y-4">
              <div className="sticky top-6 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    লাইভ প্রিভিউ (Live Preview)
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                    {tipJarConfig.enabled ? 'সক্রিয়' : 'বন্ধ'}
                  </span>
                </div>

                {/* Meme Image Preview */}
                <div className="space-y-2">
                  <span className="text-xs text-slate-400">বর্তমান মিম ছবি:</span>
                  <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 relative flex items-center justify-center">
                    <img
                      src={tipJarConfig.imageUrl || '/iphone-fund-meme.jpg'}
                      alt="Preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/iphone-fund-meme.jpg';
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-xs px-2 py-1 rounded text-[10px] text-amber-300 truncate">
                      {tipJarConfig.title}
                    </div>
                  </div>
                </div>

                {/* Leaderboard snippet in preview */}
                {tipJarConfig.showLeaderboard !== false && (tipJarConfig.leaderboard?.length ?? 0) > 0 && (
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      লিডারবোর্ড প্রিভিউ
                    </span>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {(tipJarConfig.leaderboard || []).slice(0, 3).map((d, i) => (
                        <div key={d.id || i} className="flex justify-between text-[11px] text-slate-300 truncate">
                          <span className="truncate">{d.name} sent:</span>
                          <span className="text-amber-400 font-bold ml-1 shrink-0">{d.amount} ৳</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pill Mockup */}
                <div className="space-y-2">
                  <span className="text-xs text-slate-400">স্ক্রিনের নিচে যেমন দেখাবে:</span>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-amber-400 bg-neutral-900 shrink-0">
                      <img
                        src={tipJarConfig.imageUrl || '/iphone-fund-meme.jpg'}
                        alt="Meme"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/iphone-fund-meme.jpg';
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {tipJarConfig.buttonText}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        Send Money (bKash/Nagad/Rocket)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Numbers Summary */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>bKash:</span>
                    <span className="text-pink-400 font-mono font-bold">{tipJarConfig.bkashNumber || 'দেওয়া হয়নি'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>নগদ:</span>
                    <span className="text-orange-400 font-mono font-bold">{tipJarConfig.nagadNumber || 'দেওয়া হয়নি'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>রকেট:</span>
                    <span className="text-purple-400 font-mono font-bold">{tipJarConfig.rocketNumber || 'দেওয়া হয়নি'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    saveTipJarSettings(tipJarConfig);
                    setTipJarSavedMessage('✓ সেটিংস সংরক্ষিত হয়েছে!');
                    setTimeout(() => setTipJarSavedMessage(null), 3500);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#ef4d23] hover:bg-[#de3d13] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>পরিবর্তন সংরক্ষণ করুন</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: NAMAZ REMINDER */}
      {activeAdminTab === 'namaz' && (
        <div className="space-y-6">
          {/* Main Status Header */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl shrink-0">
                🕌
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>নামাজ রিমাইন্ডার সেটিংস ও লাইভ ওয়াক্ত</span>
                  <span className="text-[11px] font-normal text-emerald-300 bg-emerald-950 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                    ঢাকা, বাংলাদেশ সময়
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  শিক্ষার্থীরা ওয়েবসাইটে থাকা অবস্থায় ওয়াক্ত অনুযায়ী নামাজের সুন্দর পপ-আপ রিমাইন্ডার পাবে
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const nextState = !namazEnabled;
                  setNamazEnabled(nextState);
                  setReminderEnabled(nextState);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  namazEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{namazEnabled ? 'রিমাইন্ডার চালু আছে' : 'রিমাইন্ডার বন্ধ আছে'}</span>
              </button>
            </div>
          </div>

          {/* Today's Waqt Schedule Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                আজকের নামাজের সময়সূচি (লাইভ ওয়াক্ত)
              </span>
              {prayerSchedule.currentPrayer && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  এখন চলছে: {prayerSchedule.currentPrayer.banglaName} ওয়াক্ত ({prayerSchedule.currentPrayer.formattedTime})
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { name: 'ফজর', time: prayerSchedule.fajr, key: 'fajr' },
                { name: 'সূর্যোদয়', time: prayerSchedule.sunrise, key: 'sunrise' },
                { name: 'যোহর', time: prayerSchedule.dhuhr, key: 'dhuhr' },
                { name: 'আসর', time: prayerSchedule.asr, key: 'asr' },
                { name: 'মাগরিব', time: prayerSchedule.maghrib, key: 'maghrib' },
                { name: 'এশা', time: prayerSchedule.isha, key: 'isha' },
              ].map((item) => {
                const isActive = prayerSchedule.currentPrayer?.key === item.key;
                return (
                  <div
                    key={item.key}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-md shadow-emerald-900/20 ring-1 ring-emerald-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{item.name}</span>
                      {isActive && (
                        <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                          চলছে
                        </span>
                      )}
                    </div>
                    <p className={`text-base font-bold mt-1 font-mono ${isActive ? 'text-emerald-300' : 'text-slate-100'}`}>
                      {formatBengaliTime(item.time)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test & Preview Section */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⚡ পপ-আপ রিমাইন্ডার টেস্ট করুন</span>
                <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-md">
                  লাইভ প্রিভিউ
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                যে কোনো বাটনে ক্লিক করে ওয়েবসাইট ভিজিটরদের সামনে যেভাবে নোটিফিকেশন আসবে তা এখনই পরীক্ষা করে দেখতে পারেন:
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {[
                { label: 'যোহরের রিমাইন্ডার টেস্ট', key: 'dhuhr' as PrayerName },
                { label: 'আসরের রিমাইন্ডার টেস্ট', key: 'asr' as PrayerName },
                { label: 'মাগরিবের রিমাইন্ডার টেস্ট', key: 'maghrib' as PrayerName },
                { label: 'এশার রিমাইন্ডার টেস্ট', key: 'isha' as PrayerName },
                { label: 'ফজরের রিমাইন্ডার টেস্ট', key: 'fajr' as PrayerName },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('test-prayer-reminder', { detail: { prayer: btn.key } })
                    );
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-700 hover:text-white border border-slate-700 hover:border-emerald-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>🕌</span>
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Smart UX details */}
            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-400">
              <div className="space-y-1">
                <span className="font-semibold text-slate-200">১. স্মার্ট ফ্রিকোয়েন্সি</span>
                <p className="text-[11px] leading-relaxed">
                  একজন শিক্ষার্থী একবার উত্তর দিলে ("পড়েছি" বা "এখন পড়ব") সেই ওয়াক্তে আর দ্বিতীয়বার পপ-আপ আসবে না।
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-slate-200">২. স্নুজ সুবিধা</span>
                <p className="text-[11px] leading-relaxed">
                  "১০ মিনিট পর মনে করিয়ে দাও" দিলে ঠিক ১০ মিনিট পর মার্জিতভাবে আবার পপ-আপ আসবে।
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-slate-200">৩. সম্পূর্ণ ঐচ্ছিক</span>
                <p className="text-[11px] leading-relaxed">
                  ইউজার চাইলে নোটিফিকেশন থেকেই রিমাইন্ডার মিউট করতে পারবে, জোর করার কোনো বিষয় নেই।
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

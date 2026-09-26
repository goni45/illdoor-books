import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  Tag,
  Clock,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  X,
  Send,
  AlertCircle,
  BookmarkCheck,
  CheckCircle2,
  Trash2,
  Layers3,
  BookMarked,
  Filter,
  Phone,
  MessageCircle,
  PhoneCall,
  User,
  School,
  ExternalLink,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { DEPARTMENTS, SEMESTERS } from '../data/mockData';
import { UserAvatar } from '../components/common/UserAvatar';
import { ContactRequesterModal } from '../components/ContactRequesterModal';
import type { BookRequest } from '../types';

const cleanPhoneDigits = (val: string) => {
  const digits = val.replace(/\D/g, '');
  return digits.startsWith('01') ? `88${digits}` : digits;
};

export const RequestsPage: React.FC = () => {
  const {
    books,
    bookRequests,
    loadingRequests,
    createBookRequest,
    cancelBookRequest,
    fulfillBookRequest,
    startSellForRequest,
    revealRequesterContact,
    currentUser,
    isAuthenticated,
    openAuthModal,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [filterType, setFilterType] = useState<'all' | 'single' | 'semester'>('all');
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Contact Modal State
  const [selectedRequestForContact, setSelectedRequestForContact] = useState<BookRequest | null>(null);
  const [contactModalData, setContactModalData] = useState<{ phone?: string; whatsapp?: string; errorMessage?: string }>({});
  const [loadingContactId, setLoadingContactId] = useState<string | null>(null);

  // Modal Request Type: 'single_book' or 'full_semester'
  const [requestMode, setRequestMode] = useState<'single_book' | 'full_semester'>('single_book');

  // New Request Form State
  const [formData, setFormData] = useState({
    title: '',
    subjectCode: '',
    department: currentUser.department || DEPARTMENTS[1],
    semester: currentUser.semester || SEMESTERS[0],
    preferredPublication: 'any',
    maxBudget: '',
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Curriculum books matching selected department and semester (for full semester preview)
  const semesterCurriculumBooks = useMemo(() => {
    const deptNorm = (formData.department || '').trim().toLowerCase();
    const sem = formData.semester;
    return books.filter((b) => {
      const matchCurriculum = (b.curriculumEntries ?? []).some(
        (c) => c.department.trim().toLowerCase() === deptNorm && c.semester === sem
      );
      const matchDirect = b.department.trim().toLowerCase() === deptNorm && b.semester === sem;
      return matchCurriculum || matchDirect;
    });
  }, [books, formData.department, formData.semester]);

  // When switching to full_semester or changing department/semester, update suggested title
  useEffect(() => {
    if (requestMode === 'full_semester') {
      const suggested = `${formData.department} — ${formData.semester} সম্পূর্ণ বইয়ের সেট`;
      if (!formData.title || formData.title.includes('সম্পূর্ণ বইয়ের সেট')) {
        setFormData((prev) => ({ ...prev, title: suggested, subjectCode: 'FULL SET' }));
      }
    }
  }, [requestMode, formData.department, formData.semester]);

  // Copy helper
  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Direct WhatsApp click handler from card
  const handleOpenWhatsApp = async (req: BookRequest) => {
    if (!isAuthenticated) {
      openAuthModal('login', 'শিক্ষার্থীর সাথে যোগাযোগ করতে লগইন করুন');
      return;
    }

    let phone = req.requesterWhatsapp || req.requesterPhone;

    const isBundle = req.requestType === 'full_semester' || req.subjectCode === 'FULL SET';
    const msg = isBundle
      ? `আসসালামু আলাইকুম ${req.requesterName}, Illdoor-এ আপনার "${req.title}" (${req.department}, ${req.semester}) সম্পূর্ণ বইয়ের সেটের রিকোয়েস্টটি দেখেছি। আমার কাছে এই সেটের বইগুলো রয়েছে।`
      : `আসসালামু আলাইকুম ${req.requesterName}, Illdoor-এ আপনার "${req.title}" (বিষয় কোড: ${req.subjectCode}) বইটির রিকোয়েস্টটি দেখেছি। বইটি আমার কাছে রয়েছে।`;

    if (!phone) {
      setLoadingContactId(req.id);
      const res = await revealRequesterContact(req.id);
      setLoadingContactId(null);
      phone = res.whatsapp || res.phone;
      if (!phone) {
        setSelectedRequestForContact(req);
        setContactModalData({ errorMessage: res.message });
        return;
      }
    }

    if (phone) {
      const url = `https://wa.me/${cleanPhoneDigits(phone)}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Direct Call click handler from card
  const handleOpenCall = async (req: BookRequest) => {
    if (!isAuthenticated) {
      openAuthModal('login', 'শিক্ষার্থীর সাথে যোগাযোগ করতে লগইন করুন');
      return;
    }

    let phone = req.requesterPhone || req.requesterWhatsapp;

    if (!phone) {
      setLoadingContactId(req.id);
      const res = await revealRequesterContact(req.id);
      setLoadingContactId(null);
      phone = res.phone || res.whatsapp;
      if (!phone) {
        setSelectedRequestForContact(req);
        setContactModalData({ errorMessage: res.message });
        return;
      }
    }

    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  // Open full Contact Modal
  const handleOpenContactModal = async (req: BookRequest) => {
    if (!isAuthenticated) {
      openAuthModal('login', 'শিক্ষার্থীর সাথে যোগাযোগ করতে লগইন করুন');
      return;
    }

    setSelectedRequestForContact(req);
    setLoadingContactId(req.id);
    const res = await revealRequesterContact(req.id);
    setLoadingContactId(null);
    setContactModalData({
      phone: res.phone || req.requesterPhone,
      whatsapp: res.whatsapp || req.requesterWhatsapp,
      errorMessage: res.message,
    });
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    return bookRequests.filter((req) => {
      // Tab filter
      if (activeTab === 'my') {
        if (req.requesterId !== currentUser.id) return false;
      } else {
        if (req.status !== 'open') return false;
      }

      const isBundle = req.requestType === 'full_semester' || req.subjectCode === 'FULL SET';

      // Type filter
      if (filterType === 'single' && isBundle) return false;
      if (filterType === 'semester' && !isBundle) return false;

      // Department filter
      if (selectedDept !== 'All' && req.department !== selectedDept) return false;

      // Semester filter
      if (selectedSemester !== 'All' && req.semester !== selectedSemester) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          req.title.toLowerCase().includes(q) ||
          req.subjectCode.toLowerCase().includes(q) ||
          req.department.toLowerCase().includes(q) ||
          (req.requesterName && req.requesterName.toLowerCase().includes(q)) ||
          (req.preferredPublication && req.preferredPublication.toLowerCase().includes(q)) ||
          (req.description && req.description.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [bookRequests, activeTab, currentUser.id, filterType, selectedDept, selectedSemester, search]);

  const myRequestsCount = useMemo(() => {
    return bookRequests.filter((r) => r.requesterId === currentUser.id).length;
  }, [bookRequests, currentUser.id]);

  const openRequestsCount = useMemo(() => {
    return bookRequests.filter((r) => r.status === 'open').length;
  }, [bookRequests]);

  const semesterRequestsCount = useMemo(() => {
    return bookRequests.filter(
      (r) => (r.status === 'open' || activeTab === 'my') &&
             (r.requestType === 'full_semester' || r.subjectCode === 'FULL SET')
    ).length;
  }, [bookRequests, activeTab]);

  const singleRequestsCount = useMemo(() => {
    return bookRequests.filter(
      (r) => (r.status === 'open' || activeTab === 'my') &&
             r.requestType !== 'full_semester' &&
             r.subjectCode !== 'FULL SET'
    ).length;
  }, [bookRequests, activeTab]);

  // Open modal with login guard
  const handleOpenModal = (mode: 'single_book' | 'full_semester' = 'single_book') => {
    if (!isAuthenticated) {
      openAuthModal('login', 'বইয়ের অনুরোধ করতে দয়া করে লগইন করুন');
      return;
    }
    setRequestMode(mode);
    setFormError(null);
    setFormSuccess(null);
    setFormData({
      title: mode === 'full_semester' ? `${currentUser.department || DEPARTMENTS[1]} — ${currentUser.semester || SEMESTERS[0]} সম্পূর্ণ বইয়ের সেট` : '',
      subjectCode: mode === 'full_semester' ? 'FULL SET' : '',
      department: currentUser.department || DEPARTMENTS[1],
      semester: currentUser.semester || SEMESTERS[0],
      preferredPublication: 'any',
      maxBudget: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  // Submit request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const isBundle = requestMode === 'full_semester';
    const finalTitle = isBundle
      ? formData.title.trim() || `${formData.department} — ${formData.semester} সম্পূর্ণ বইয়ের সেট`
      : formData.title.trim();

    if (!finalTitle) {
      setFormError('দয়া করে বইয়ের নাম বা অনুরোধের শিরোনাম লিখুন');
      return;
    }

    const finalSubjectCode = isBundle ? 'FULL SET' : formData.subjectCode.trim();
    if (!isBundle && !finalSubjectCode) {
      setFormError('দয়া করে বিষয় কোড লিখুন (যেমন: ২৬৮১১)');
      return;
    }

    setSubmitting(true);
    const budgetNum = formData.maxBudget ? parseFloat(formData.maxBudget) : undefined;

    const res = await createBookRequest({
      title: finalTitle,
      subjectCode: finalSubjectCode,
      department: formData.department,
      semester: formData.semester,
      requestType: requestMode,
      preferredPublication: formData.preferredPublication !== 'any' ? formData.preferredPublication : undefined,
      expectedBookCount: isBundle ? semesterCurriculumBooks.length || undefined : undefined,
      maxBudget: budgetNum,
      description: formData.description,
    });

    setSubmitting(false);

    if (res.success) {
      setFormSuccess(res.message);
      setFormData({
        title: '',
        subjectCode: '',
        department: currentUser.department || DEPARTMENTS[1],
        semester: currentUser.semester || SEMESTERS[0],
        preferredPublication: 'any',
        maxBudget: '',
        description: '',
      });
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
      }, 1500);
    } else {
      setFormError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-neutral-50/50 pb-20 pt-24 sm:pt-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 p-6 sm:p-10 text-white shadow-xl mb-8 border border-neutral-800">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#ef4d23]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#ef4d23] text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#ef4d23]" />
                <span>বইয়ের চাহিদা ও সরাসরি যোগাযোগ বোর্ড</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                প্রয়োজনীয় বই বা সম্পূর্ণ সেমিস্টার সেট খুঁজছেন?
              </h1>
              <p className="mt-2 text-sm sm:text-base text-neutral-300">
                একক বই বা পুরো সেমিস্টার সেটের রিকোয়েস্ট দিন। বিক্রেতারা সরাসরি আপনার সাথে হোয়াটসঅ্যাপ বা কলে যোগাযোগ করে বই হস্তান্তর করতে পারবেন!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                onClick={() => handleOpenModal('full_semester')}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-100"
              >
                <Layers3 className="w-4 h-4 text-amber-400" />
                <span>ফুল সেমিস্টার সেট রিকোয়েস্ট</span>
              </button>

              <button
                onClick={() => handleOpenModal('single_book')}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#ef4d23] to-[#ff6b42] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-[#ef4d23]/25 hover:shadow-xl hover:shadow-[#ef4d23]/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>বইয়ের অনুরোধ করুন</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab & Type Filter Bar */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Main Tabs (All vs My Requests) */}
            <div className="inline-flex p-1 bg-neutral-100 rounded-2xl border border-neutral-200/80 self-start">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>চলমান অনুরোধসমূহ</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700">
                  {openRequestsCount}
                </span>
              </button>

              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    openAuthModal('login', 'আপনার অনুরোধসমূহ দেখতে লগইন করুন');
                    return;
                  }
                  setActiveTab('my');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'my'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>আমার অনুরোধ</span>
                {isAuthenticated && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ef4d23]/10 text-[#ef4d23]">
                    {myRequestsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center gap-2 self-start flex-wrap">
              <span className="text-xs text-neutral-500 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> ধরন:
              </span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                সকল ধরন
              </button>
              <button
                onClick={() => setFilterType('single')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'single'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span>একক বই ({singleRequestsCount})</span>
              </button>
              <button
                onClick={() => setFilterType('semester')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'semester'
                    ? 'bg-[#ef4d23] text-white shadow-sm shadow-[#ef4d23]/25'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <Layers3 className="w-3.5 h-3.5 text-amber-500" />
                <span>সেমিস্টার সেট ({semesterRequestsCount})</span>
              </button>
            </div>
          </div>

          {/* Search & Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="বিষয় কোড, বইয়ের নাম বা শিক্ষার্থীর নাম..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#ef4d23]/20 focus:border-[#ef4d23] transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Select */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-neutral-700 focus:outline-none focus:border-[#ef4d23] cursor-pointer"
            >
              <option value="All">সকল ডিপার্টমেন্ট</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Semester Select */}
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-neutral-700 focus:outline-none focus:border-[#ef4d23] cursor-pointer"
            >
              <option value="All">সকল সেমিস্টার</option>
              {SEMESTERS.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content List */}
        {loadingRequests ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 rounded-2xl bg-white border border-neutral-100 p-5 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-4 bg-neutral-200 rounded w-2/3" />
                  <div className="h-3 bg-neutral-100 rounded w-1/3" />
                  <div className="h-3 bg-neutral-100 rounded w-full" />
                </div>
                <div className="h-10 bg-neutral-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white/70 p-12 text-center my-6">
            <div className="w-16 h-16 rounded-full bg-[#ef4d23]/10 text-[#ef4d23] flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">
              {activeTab === 'my' ? 'আপনি এখনো কোনো বইয়ের অনুরোধ করেননি' : 'কোনো বইয়ের অনুরোধ পাওয়া যায়নি'}
            </h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto mb-6">
              {activeTab === 'my'
                ? 'আপনার প্রয়োজনীয় কোনো নির্দিষ্ট বই বা পুরো সেমিস্টার সেট পেতে চান? একটি অনুরোধ তৈরি করুন, ক্যাম্পাসে পাওয়া গেলে সরাসরি যোগাযোগ পাবেন।'
                : 'সকল অনুরোধ দেখতে সার্চ বা ফিল্টার রিসেট করুন, অথবা প্রথম অনুরোধটি তৈরি করুন।'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleOpenModal('full_semester')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-800 text-xs sm:text-sm font-semibold hover:bg-neutral-200 transition-colors cursor-pointer border border-neutral-200"
              >
                <Layers3 className="w-4 h-4 text-amber-500" />
                <span>ফুল সেমিস্টার সেট রিকোয়েস্ট</span>
              </button>
              <button
                onClick={() => handleOpenModal('single_book')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>একক বইয়ের অনুরোধ</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRequests.map((req) => {
              const isMine = req.requesterId === currentUser.id;
              const isBundle = req.requestType === 'full_semester' || req.subjectCode === 'FULL SET';
              const isLoadingThis = loadingContactId === req.id;

              return (
                <div
                  key={req.id}
                  className={`group relative bg-white rounded-3xl border p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
                    isBundle
                      ? 'border-orange-200/90 hover:border-[#ef4d23]/60 bg-gradient-to-b from-orange-50/25 via-white to-white'
                      : 'border-neutral-200/90 hover:border-neutral-300'
                  }`}
                >
                  {/* Top: Badges & Status */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {isBundle ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-100/80 text-[#ef4d23] font-bold text-xs border border-orange-200">
                            <Layers3 className="w-3.5 h-3.5 text-[#ef4d23]" />
                            <span>সম্পূর্ণ সেমিস্টার সেট</span>
                          </span>
                          {req.expectedBookCount && (
                            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-semibold">
                              {req.expectedBookCount}টি বই
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 text-[#ef4d23] font-mono font-bold text-xs border border-orange-200/60">
                            <Tag className="w-3 h-3" />
                            <span>{req.subjectCode}</span>
                          </span>
                          <button
                            onClick={() => handleCopyCode(req.id, req.subjectCode)}
                            title="বিষয় কোড কপি করুন"
                            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                          >
                            {copiedId === req.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Status / Mine badge */}
                      {isMine ? (
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            req.status === 'open'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : req.status === 'fulfilled'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {req.status === 'open' ? 'আপনার সক্রিয় অনুরোধ' : req.status === 'fulfilled' ? 'বই পাওয়া গেছে' : 'বাতিল'}
                        </span>
                      ) : (
                        req.maxBudget != null && (
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                              বাজেট
                            </span>
                            <span className="text-sm font-extrabold text-[#ef4d23]">
                              ৳{req.maxBudget}
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    {/* Book Title */}
                    <h3 className="font-bold text-neutral-900 text-base leading-snug group-hover:text-[#ef4d23] transition-colors mb-2 line-clamp-2">
                      {req.title}
                    </h3>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3 text-[11px] text-neutral-600">
                      <span className="bg-neutral-100 px-2 py-0.5 rounded-md font-medium">
                        {req.department}
                      </span>
                      <span className="bg-neutral-100 px-2 py-0.5 rounded-md font-medium">
                        {req.semester}
                      </span>
                      {req.preferredPublication && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-md font-medium">
                          পছন্দ: {req.preferredPublication}
                        </span>
                      )}
                    </div>

                    {/* Description notes */}
                    {req.description && (
                      <p className="text-xs text-neutral-500 line-clamp-2 bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-100 mb-3 whitespace-pre-line">
                        "{req.description}"
                      </p>
                    )}
                  </div>

                  {/* Bottom: Requester Profile Box & Action Buttons */}
                  <div className="pt-3 border-t border-neutral-100 mt-2 space-y-3">
                    {/* Requester Info Bar */}
                    <div className="flex items-center justify-between bg-neutral-50/70 p-2.5 rounded-2xl border border-neutral-100/90">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar name={req.requesterName} src={req.requesterAvatar} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-800 truncate">
                            {req.requesterName}
                          </p>
                          <p className="text-[10px] text-neutral-500 truncate flex items-center gap-1">
                            <span>{req.requesterInstitute || req.department}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-neutral-400 flex items-center gap-1 justify-end">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{req.createdAt}</span>
                        </span>
                        {req.requesterRoll && (
                          <span className="text-[10px] font-mono text-neutral-400">
                            রোল: {req.requesterRoll}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {isMine ? (
                      <div className="flex items-center gap-2">
                        {req.status === 'open' && (
                          <>
                            <button
                              onClick={() => fulfillBookRequest(req.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>বই পেয়েছি চিহ্নিত করুন</span>
                            </button>
                            <button
                              onClick={() => cancelBookRequest(req.id)}
                              className="inline-flex items-center justify-center p-2.5 rounded-xl bg-neutral-100 text-neutral-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="অনুরোধ বাতিল করুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {req.status !== 'open' && (
                          <div className="w-full text-center py-2 text-xs text-neutral-400 font-medium bg-neutral-50 rounded-xl">
                            অনুরোধ সম্পন্ন হয়েছে
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Primary: Direct Contact options (WhatsApp & Call) */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(req)}
                            disabled={isLoadingThis}
                            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                            <span>WhatsApp চ্যাট</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenCall(req)}
                            disabled={isLoadingThis}
                            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5 fill-white" />
                            <span>কল দিন (Call)</span>
                          </button>
                        </div>

                        {/* Secondary Button: "আমার কাছে আছে (লিস্টিং তৈরি করুন)" */}
                        <button
                          onClick={() => handleOpenContactModal(req)}
                          className={`w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            isBundle
                              ? 'bg-orange-50 hover:bg-orange-100 text-[#ef4d23] border-orange-200'
                              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}
                        >
                          {isBundle ? (
                            <>
                              <Layers3 className="w-3.5 h-3.5 text-[#ef4d23]" />
                              <span>আমার কাছে এই সেট আছে (বিস্তারিত ও লিস্টিং)</span>
                            </>
                          ) : (
                            <>
                              <span>আমার কাছে বইটি আছে (বিস্তারিত ও লিস্টিং)</span>
                              <ArrowRight className="w-3 h-3 text-neutral-400" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Details Modal */}
      {selectedRequestForContact && (
        <ContactRequesterModal
          isOpen={Boolean(selectedRequestForContact)}
          onClose={() => setSelectedRequestForContact(null)}
          request={selectedRequestForContact}
          contactData={contactModalData}
          onStartSell={(req) => startSellForRequest(req)}
          isLoading={loadingContactId === selectedRequestForContact.id}
        />
      )}

      {/* Post a Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#ef4d23]/10 text-[#ef4d23] flex items-center justify-center font-bold">
                {requestMode === 'full_semester' ? (
                  <Layers3 className="w-5 h-5 text-[#ef4d23]" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-neutral-900">
                  {requestMode === 'full_semester'
                    ? 'সম্পূর্ণ সেমিস্টার সেট রিকোয়েস্ট'
                    : 'বইয়ের রিকোয়েস্ট তৈরি করুন'}
                </h2>
                <p className="text-xs text-neutral-500">
                  ক্যাম্পাসের শিক্ষার্থীদের জানান এবং বিক্রেতারা সরাসরি যোগাযোগ করবেন।
                </p>
              </div>
            </div>

            {/* Request Type Switcher (Single vs Full Semester) */}
            <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-2xl mb-5 border border-neutral-200/80">
              <button
                type="button"
                onClick={() => {
                  setRequestMode('single_book');
                  setFormData((prev) => ({
                    ...prev,
                    title: '',
                    subjectCode: '',
                  }));
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  requestMode === 'single_book'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <BookMarked className="w-4 h-4" />
                <span>একটি নির্দিষ্ট বই</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequestMode('full_semester');
                  setFormData((prev) => ({
                    ...prev,
                    title: `${prev.department} — ${prev.semester} সম্পূর্ণ বইয়ের সেট`,
                    subjectCode: 'FULL SET',
                  }));
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  requestMode === 'full_semester'
                    ? 'bg-white text-[#ef4d23] shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Layers3 className="w-4 h-4 text-amber-500" />
                <span>সম্পূর্ণ সেমিস্টার বান্ডেল</span>
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              {/* Department & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    ডিপার্টমেন্ট *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#ef4d23] cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    সেমিস্টার *
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#ef4d23] cursor-pointer"
                  >
                    {SEMESTERS.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* If Full Semester mode: Show Curriculum Books included preview */}
              {requestMode === 'full_semester' && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Layers3 className="w-3.5 h-3.5 text-[#ef4d23]" />
                      <span>{formData.department} — {formData.semester} সিলেবাসের বইসমূহ</span>
                    </span>
                    <span className="text-[11px] font-bold text-[#ef4d23] bg-white px-2 py-0.5 rounded-full border border-amber-200">
                      {semesterCurriculumBooks.length}টি বিষয়
                    </span>
                  </div>

                  {semesterCurriculumBooks.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                      {semesterCurriculumBooks.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/80 border border-amber-100"
                        >
                          <span className="font-medium text-neutral-800 truncate mr-2">
                            {b.title}
                          </span>
                          <span className="font-mono text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">
                            {b.subjectCode}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-500">
                      এই সেমিস্টারের পাঠ্যসূচির সম্পূর্ণ বইয়ের বান্ডেল হিসেবে অনুরোধ পোস্ট হবে।
                    </p>
                  )}
                </div>
              )}

              {/* Book / Request Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  {requestMode === 'full_semester' ? 'অনুরোধের শিরোনাম *' : 'বইয়ের নাম বা শিরোনাম *'}
                </label>
                <input
                  type="text"
                  placeholder={
                    requestMode === 'full_semester'
                      ? 'যেমন: কম্পিউটার ৩য় সেমিস্টার সম্পূর্ণ বইয়ের সেট'
                      : 'যেমন: ইলেকট্রিক্যাল সার্কিটস অ্যান্ড মেশিনস'
                  }
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ef4d23]/20 focus:border-[#ef4d23]"
                  required
                />
              </div>

              {/* Subject Code (Only for single book) */}
              {requestMode === 'single_book' && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    বিষয় কোড (Subject Code) *
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: ২৬৮১১"
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#ef4d23]/20 focus:border-[#ef4d23]"
                    required
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    বিটিইবি সিলেবাসের ৫-সংখ্যার বিষয় কোড দিলে অন্যরা সহজেই চিনতে পারবে।
                  </p>
                </div>
              )}

              {/* Preferred Publication */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  পছন্দের প্রকাশনী (ঐচ্ছিক)
                </label>
                <select
                  value={formData.preferredPublication}
                  onChange={(e) => setFormData({ ...formData, preferredPublication: e.target.value })}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#ef4d23] cursor-pointer"
                >
                  <option value="any">যে কোনো প্রকাশনী (Any)</option>
                  <option value="Haque Publication">Haque Publication (হক প্রকাশনী)</option>
                  <option value="Technical Publication">Technical Publication (টেকনিক্যাল প্রকাশনী)</option>
                </select>
              </div>

              {/* Max Budget */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  আপনার সর্বোচ্চ বাজেট (৳ টাকা) - ঐচ্ছিক
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-sm">
                    ৳
                  </span>
                  <input
                    type="number"
                    placeholder={requestMode === 'full_semester' ? 'যেমন: ১২০০' : 'যেমন: ৩০০'}
                    value={formData.maxBudget}
                    onChange={(e) => setFormData({ ...formData, maxBudget: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ef4d23]/20 focus:border-[#ef4d23]"
                    min="1"
                  />
                </div>
              </div>

              {/* Additional notes */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  বিশেষ দ্রষ্টব্য / চাহিদা (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    requestMode === 'full_semester'
                      ? 'যেমন: ২০২২ প্রবিধানের সব বই দরকার। পাতা ও বাইন্ডিং ভালো থাকতে হবে।'
                      : 'যেমন: ২০২২ প্রবিধানের বই দরকার। পাতা পরিষ্কার থাকলে ভালো হয়।'
                  }
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#ef4d23]/20 focus:border-[#ef4d23]"
                />
              </div>

              {/* Submit button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ef4d23] hover:bg-[#d93f17] text-white text-xs font-semibold shadow-md shadow-[#ef4d23]/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <span>পোস্ট হচ্ছে...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {requestMode === 'full_semester'
                          ? 'সেট অনুরোধ পোস্ট করুন'
                          : 'অনুরোধ পোস্ট করুন'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;

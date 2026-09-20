import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  Filter,
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
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { BookRequest } from '../types';
import { DEPARTMENTS, SEMESTERS } from '../data/mockData';
import { UserAvatar } from '../components/common/UserAvatar';

export const RequestsPage: React.FC = () => {
  const {
    bookRequests,
    loadingRequests,
    createBookRequest,
    cancelBookRequest,
    fulfillBookRequest,
    startSellForRequest,
    currentUser,
    isAuthenticated,
    openAuthModal,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Request Form State
  const [formData, setFormData] = useState({
    title: '',
    subjectCode: '',
    department: currentUser.department || DEPARTMENTS[1],
    semester: currentUser.semester || SEMESTERS[0],
    maxBudget: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Copy subject code helper
  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
          (req.description && req.description.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [bookRequests, activeTab, currentUser.id, selectedDept, selectedSemester, search]);

  const myRequestsCount = useMemo(() => {
    return bookRequests.filter((r) => r.requesterId === currentUser.id).length;
  }, [bookRequests, currentUser.id]);

  const openRequestsCount = useMemo(() => {
    return bookRequests.filter((r) => r.status === 'open').length;
  }, [bookRequests]);

  // Open modal with login guard
  const handleOpenModal = () => {
    if (!isAuthenticated) {
      openAuthModal('login', 'বইয়ের অনুরোধ করতে দয়া করে লগইন করুন (Please log in to post a request)');
      return;
    }
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  // Submit request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError('দয়া করে বইয়ের নাম লিখুন (Book title is required)');
      return;
    }
    if (!formData.subjectCode.trim()) {
      setFormError('দয়া করে বিষয় কোড লিখুন (Subject code is required, e.g. 26811)');
      return;
    }

    setSubmitting(true);
    const budgetNum = formData.maxBudget ? parseFloat(formData.maxBudget) : undefined;

    const res = await createBookRequest({
      title: formData.title,
      subjectCode: formData.subjectCode,
      department: formData.department,
      semester: formData.semester,
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
                <span>Demand & Request Board (বইয়ের চাহিদা)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Can't find your syllabus book?
              </h1>
              <p className="mt-2 text-sm sm:text-base text-neutral-300">
                Post a request with your subject code and budget. Seniors and peers with matching books will be notified to list them for campus pickup!
              </p>
            </div>

            <button
              onClick={handleOpenModal}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#ef4d23] to-[#ff6b42] text-white font-semibold text-sm shadow-lg shadow-[#ef4d23]/25 hover:shadow-xl hover:shadow-[#ef4d23]/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Request a Textbook</span>
            </button>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="inline-flex p-1 bg-neutral-100 rounded-2xl border border-neutral-200/80">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Active Requests</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700">
                {openRequestsCount}
              </span>
            </button>

            <button
              onClick={() => {
                if (!isAuthenticated) {
                  openAuthModal('login', 'আপনার অনুরোধসমূহ দেখতে লগইন করুন (Log in to see your requests)');
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
              <span>My Requests</span>
              {isAuthenticated && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ef4d23]/10 text-[#ef4d23]">
                  {myRequestsCount}
                </span>
              )}
            </button>
          </div>

          {/* Search & Filter Inputs */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search code (e.g. 26811) or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#ef4d23]/20 focus:border-[#ef4d23] transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
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
              <option value="All">All Departments</option>
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
              <option value="All">All Semesters</option>
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
                className="h-48 rounded-2xl bg-white border border-neutral-100 p-5 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-4 bg-neutral-200 rounded w-2/3" />
                  <div className="h-3 bg-neutral-100 rounded w-1/3" />
                  <div className="h-3 bg-neutral-100 rounded w-full" />
                </div>
                <div className="h-8 bg-neutral-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white/70 p-12 text-center my-6">
            <div className="w-16 h-16 rounded-full bg-[#ef4d23]/10 text-[#ef4d23] flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">
              {activeTab === 'my' ? 'You haven’t posted any requests yet' : 'No matching book requests found'}
            </h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto mb-6">
              {activeTab === 'my'
                ? 'Looking for a rare textbook or course material? Create a request and we will alert sellers when it is listed.'
                : 'Try clearing your search or filters to see all campus requests, or create the first one.'}
            </p>
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post a Book Request</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRequests.map((req) => {
              const isMine = req.requesterId === currentUser.id;

              return (
                <div
                  key={req.id}
                  className="group relative bg-white rounded-2xl border border-neutral-200/90 hover:border-neutral-300 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  {/* Top: Badges & Status */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-[#ef4d23] font-mono font-bold text-xs border border-orange-200/60">
                          <Tag className="w-3 h-3" />
                          <span>{req.subjectCode}</span>
                        </span>
                        <button
                          onClick={() => handleCopyCode(req.id, req.subjectCode)}
                          title="Copy subject code"
                          className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                        >
                          {copiedId === req.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Status / Mine badge */}
                      {isMine ? (
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            req.status === 'open'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : req.status === 'fulfilled'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {req.status === 'open' ? 'Your Active Request' : req.status}
                        </span>
                      ) : (
                        req.maxBudget != null && (
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                              Max Budget
                            </span>
                            <span className="text-sm font-extrabold text-neutral-900">
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
                    </div>

                    {/* Description notes */}
                    {req.description && (
                      <p className="text-xs text-neutral-500 line-clamp-2 bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-100 mb-4">
                        "{req.description}"
                      </p>
                    )}
                  </div>

                  {/* Bottom: Requester Info & Actions */}
                  <div className="pt-3 border-t border-neutral-100 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar name={req.requesterName} src={req.requesterAvatar} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-800 truncate">
                            {req.requesterName}
                          </p>
                          <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{req.createdAt}</span>
                          </p>
                        </div>
                      </div>

                      {isMine && req.maxBudget != null && (
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 block font-medium">Budget</span>
                          <span className="text-xs font-bold text-neutral-800">৳{req.maxBudget}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {isMine ? (
                      <div className="flex items-center gap-2">
                        {req.status === 'open' && (
                          <>
                            <button
                              onClick={() => fulfillBookRequest(req.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark Found</span>
                            </button>
                            <button
                              onClick={() => cancelBookRequest(req.id)}
                              className="inline-flex items-center justify-center p-2 rounded-xl bg-neutral-100 text-neutral-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Cancel request"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {req.status !== 'open' && (
                          <div className="w-full text-center py-1.5 text-xs text-neutral-400 font-medium bg-neutral-50 rounded-xl">
                            Request completed
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => startSellForRequest(req)}
                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-[#ef4d23] text-white text-xs font-semibold transition-colors cursor-pointer group/btn"
                      >
                        <span>I Have This Book (Sell)</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Post a Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-[#ef4d23]/10 text-[#ef4d23] flex items-center justify-center font-bold">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-neutral-900">Request a Book (বইয়ের আবেদন)</h2>
                <p className="text-xs text-neutral-500">
                  Notify campus seniors and get alerted the instant a matching book is listed.
                </p>
              </div>
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
              {/* Book Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Book Name / Textbook Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Electrical Circuits and Machines"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ef4d23]/20 focus:border-[#ef4d23]"
                  required
                />
              </div>

              {/* Subject Code */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Subject Code (বিষয় কোড) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 26811"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#ef4d23]/20 focus:border-[#ef4d23]"
                  required
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Students and sellers search mostly by 5-digit BTEB syllabus codes.
                </p>
              </div>

              {/* Department & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#ef4d23]"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#ef4d23]"
                  >
                    {SEMESTERS.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Max Budget */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Your Maximum Budget (৳ BDT) - Optional
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-sm">
                    ৳
                  </span>
                  <input
                    type="number"
                    placeholder="e.g. 300"
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
                  Notes / Edition Preference (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prefer 2022 probidhan syllabus edition. Clean pages preferred."
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
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ef4d23] hover:bg-[#d93f17] text-white text-xs font-semibold shadow-md shadow-[#ef4d23]/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <span>Posting...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Request</span>
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

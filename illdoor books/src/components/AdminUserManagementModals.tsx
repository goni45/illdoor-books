import React, { useState } from 'react';
import {
  X,
  Ban,
  UserCheck,
  CheckCircle2,
  BadgeCheck,
  Pencil,
  Trash2,
  ExternalLink,
  Phone,
  Mail,
  BookOpen,
  ShoppingBag,
  Bell,
  Loader2,
  Save,
  AlertTriangle,
  Building2,
  GraduationCap,
} from 'lucide-react';
import {
  StudentUser,
  BookListing,
  Order,
  BookRequest,
  PickupPoint,
  Condition,
  BookAvailability,
} from '../types';

export interface EditableListing {
  listingId: string;
  bookId: string;
  title: string;
  subjectCode: string;
  department: string;
  sellerName: string;
  sellerRoll?: string;
  sellerInstitute?: string;
  sellingPrice: number;
  originalPrice: number;
  condition: Condition;
  conditionDetails: string;
  availability: BookAvailability;
  pickupPointId: string;
  pickupPointName: string;
}

interface AdminUserManagementModalsProps {
  selectedUserForDetails: StudentUser | null;
  onCloseUserDetails: () => void;
  userToBan: StudentUser | null;
  banReasonInput: string;
  setBanReasonInput: (val: string) => void;
  onCloseBanModal: () => void;
  onConfirmBan: () => Promise<void>;
  isBanning: boolean;
  onConfirmUnban: (u: StudentUser) => Promise<void>;
  onInitiateBan: (u: StudentUser) => void;

  editingListing: EditableListing | null;
  onCloseListingEdit: () => void;
  editFormSellingPrice: number;
  setEditFormSellingPrice: (v: number) => void;
  editFormOriginalPrice: number;
  setEditFormOriginalPrice: (v: number) => void;
  editFormCondition: Condition;
  setEditFormCondition: (v: Condition) => void;
  editFormConditionDetails: string;
  setEditFormConditionDetails: (v: string) => void;
  editFormAvailability: BookAvailability;
  setEditFormAvailability: (v: BookAvailability) => void;
  editFormPickupPointId: string;
  setEditFormPickupPointId: (v: string) => void;
  onSaveListingEdit: () => Promise<void>;
  isSavingListingEdit: boolean;
  listingEditMessage: string | null;

  pickupPoints: PickupPoint[];
  books: BookListing[];
  orders: Order[];
  bookRequests: BookRequest[];

  onOpenListingEdit: (item: any) => void;
  onToggleListingStatus: (listingId: string, status: BookAvailability) => Promise<void>;
  onDeleteListing: (listingId: string) => Promise<void>;
  onNavigateToBook: (bookId: string) => void;
  onNavigateToOrder: (orderId: string) => void;
}

export const AdminUserManagementModals: React.FC<AdminUserManagementModalsProps> = ({
  selectedUserForDetails,
  onCloseUserDetails,
  userToBan,
  banReasonInput,
  setBanReasonInput,
  onCloseBanModal,
  onConfirmBan,
  isBanning,
  onConfirmUnban,
  onInitiateBan,

  editingListing,
  onCloseListingEdit,
  editFormSellingPrice,
  setEditFormSellingPrice,
  editFormOriginalPrice,
  setEditFormOriginalPrice,
  editFormCondition,
  setEditFormCondition,
  editFormConditionDetails,
  setEditFormConditionDetails,
  editFormAvailability,
  setEditFormAvailability,
  editFormPickupPointId,
  setEditFormPickupPointId,
  onSaveListingEdit,
  isSavingListingEdit,
  listingEditMessage,

  pickupPoints,
  books,
  orders,
  bookRequests,

  onOpenListingEdit,
  onToggleListingStatus,
  onDeleteListing,
  onNavigateToBook,
  onNavigateToOrder,
}) => {
  const [activeUserTab, setActiveUserTab] = useState<'listings' | 'orders' | 'requests'>('listings');

  return (
    <>
      {/* 1. BAN / SUSPENSION MODAL */}
      {userToBan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <Ban className="w-5 h-5" />
                <span>ব্যবহারকারী ব্যান করুন</span>
              </div>
              <button
                type="button"
                onClick={onCloseBanModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{userToBan.name}</span>
                {userToBan.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-amber-400 shrink-0" />
                )}
              </div>
              <div className="text-xs text-slate-300 font-mono">
                রোল: {userToBan.rollNumber || userToBan.studentId || 'তথ্য নেই'} • {userToBan.department || ''}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {userToBan.institute}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                ব্যান করার কারণ (Reason):
              </label>
              <textarea
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                placeholder="ব্যান করার সুনির্দিষ্ট কারণ লিখুন (যেমন: ফেক লিস্টিং, স্প্যাম, নিয়মের চরম লঙ্ঘন)..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />
              <p className="text-[11px] text-rose-300/80 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>ব্যান করা হলে ইউজার কোনো বই আপলোড, অর্ডার বা রিকোয়েস্ট করতে পারবে নাॷ</span>
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onCloseBanModal}
                disabled={isBanning}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={onConfirmBan}
                disabled={isBanning}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-rose-900/30 disabled:opacity-50"
              >
                {isBanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>প্রক্রিয়াধীন...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>ব্যান নিশ্চিত করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT LISTING MODAL */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h4 className="font-bold text-base text-white flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-cyan-400" />
                  <span>লিস্টিং সম্পাদনা (Admin Control)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">
                  {editingListing.title} ({editingListing.subjectCode})
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseListingEdit}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {listingEditMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{listingEditMessage}</span>
              </div>
            )}

            <div className="text-xs text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-slate-400">বিক্রেতা: </span>
                <strong className="text-white">{editingListing.sellerName}</strong>
                {editingListing.sellerRoll ? ` (${editingListing.sellerRoll})` : ''}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">{editingListing.department}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">বিক্রয় মূল্য (৳):</label>
                <input
                  type="number"
                  value={editFormSellingPrice}
                  onChange={(e) => setEditFormSellingPrice(Number(e.target.value))}
                  min={0}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#ef4d23]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">আসল/মুদ্রিত মূল্য (৳):</label>
                <input
                  type="number"
                  value={editFormOriginalPrice}
                  onChange={(e) => setEditFormOriginalPrice(Number(e.target.value))}
                  min={0}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#ef4d23]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">বইয়ের অবস্থা (Condition):</label>
                <select
                  value={editFormCondition}
                  onChange={(e) => setEditFormCondition(e.target.value as Condition)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ef4d23]"
                >
                  <option value="Like New">Like New (নতুনের মতো)</option>
                  <option value="Good">Good (ভালো)</option>
                  <option value="Fair">Fair (মোটামুটি)</option>
                  <option value="Poor">Poor (পৃইঠা দাগানো/ছেঁড়া)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">লিস্টিং স্ট্যাটাস:</label>
                <select
                  value={editFormAvailability}
                  onChange={(e) => setEditFormAvailability(e.target.value as BookAvailability)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ef4d23]"
                >
                  <option value="Available">Available (বিক্রয়ের জন্য উন্মুক্ত)</option>
                  <option value="Reserved">Reserved (হোল্ড/রিজার্ভড)</option>
                  <option value="Sold">Sold (বিক্রিত)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">পিকআপ পয়েন্ট:</label>
              <select
                value={editFormPickupPointId}
                onChange={(e) => setEditFormPickupPointId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ef4d23]"
              >
                {pickupPoints.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.campus})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">অবস্থার বিস্তারিত বিবরণ (ঐচ্ছিক):</label>
              <textarea
                value={editFormConditionDetails}
                onChange={(e) => setEditFormConditionDetails(e.target.value)}
                rows={2}
                placeholder="যেমন: কিছু অধ্যায়ে পেনসিল দিয়ে দাগানো রয়েছে..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ef4d23] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onCloseListingEdit}
                disabled={isSavingListingEdit}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={onSaveListingEdit}
                disabled={isSavingListingEdit}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-cyan-900/30 disabled:opacity-50"
              >
                {isSavingListingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>সংরক্ষণ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>লিস্টিং সংরক্ষণ করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. USER PROFILE & ACTIVITY MODAL */}
      {selectedUserForDetails && (() => {
        const u = selectedUserForDetails;

        const userOffers = books.flatMap((b) =>
          (b.offers ?? [])
            .filter((o) => o.seller.id === u.id)
            .map((o) => ({
              ...o,
              bookId: b.id,
              bookTitle: b.title,
              subjectCode: b.subjectCode,
              department: b.department,
              commonImageUrl: b.images?.[0] || b.commonCoverImageUrl || '',
            }))
        );

        const userOrders = orders.filter(
          (o) => o.buyer?.id === u.id || o.seller?.id === u.id
        );

        const userRequests = bookRequests.filter(
          (r) => r.requesterId === u.id
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 pb-4 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/40">
                <div className="flex items-center gap-4">
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-16 h-16 rounded-2xl border-2 border-slate-700 object-cover shadow-md shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-white">{u.name}</h3>
                      {u.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          ভেরিফাইড
                        </span>
                      )}
                      {u.isAdmin && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ef4d23]/20 border border-[#ef4d23]/40 text-[#ef4d23] font-bold">
                          অ্যাডমিন
                        </span>
                      )}
                      {u.isBanned ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300">
                          <Ban className="w-3.5 h-3.5" />
                          স্থগিত (Banned)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          সক্রিয় সদস্য
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                      <span>রোল: {u.rollNumber || u.studentId || 'তথ্য নেই'}</span>
                      {u.registrationNo && <span>• রেজি: {u.registrationNo}</span>}
                      <span>• রেটিং: ★ {u.rating ? u.rating.toFixed(1) : '5.0'}</span>
                      <span>• সেলঈ: {u.totalSales}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                        {u.department} ({u.semester})
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" />
                        {u.institute}
                      </span>
                      {u.phone && (
                        <span className="flex items-center gap-1 font-mono text-slate-300">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {u.phone}
                        </span>
                      )}
                      {u.email && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {u.email}
                        </span>
                      )}
                    </div>

                    {u.isBanned && u.banReason && (
                      <div className="mt-2 p-2 rounded-lg bg-rose-950/50 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        <div>
                          <strong>ব্যানের কারণ: </strong>
                          <span>{u.banReason}</span>
                          {u.bannedAt && (
                            <span className="text-[10px] text-rose-400/80 block mt-0.5 font-mono">
                              ব্যান তারিখ: {new Date(u.bannedAt).toLocaleString('bn-BD')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Action Controls */}
                <div className="flex items-center gap-2">
                  {u.isBanned ? (
                    <button
                      type="button"
                      onClick={() => void onConfirmUnban(u)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>আনব্যান করুন</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onInitiateBan(u)}
                      disabled={u.isAdmin}
                      className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      title={u.isAdmin ? 'অ্যাডমিন অ্যাকাউন্ট ব্যান করা সম্ভব নয়' : 'অ্যাকাউন্ট ব্যান করুন'}
                    >
                      <Ban className="w-4 h-4" />
                      <span>ব্যান করুন</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onCloseUserDetails}
                    className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs for User Activities */}
              <div className="flex border-b border-slate-800 bg-slate-900/80 px-6 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveUserTab('listings')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeUserTab === 'listings'
                      ? 'border-[#ef4d23] text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>বই লিস্টিং ({userOffers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveUserTab('orders')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeUserTab === 'orders'
                      ? 'border-[#ef4d23] text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>অর্ডার ও ট্রানজেকশন ({userOrders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveUserTab('requests')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeUserTab === 'requests'
                      ? 'border-[#ef4d23] text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>অনুরোধ/রিকোয়েস্ট ({userRequests.length})</span>
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* TAB 1: LISTINGS */}
                {activeUserTab === 'listings' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>এই ব্যবহারকারীর মোট {userOffers.length} টি সক্রিয়/পূর্ববর্তী লিস্টিং রয়েছে:</span>
                    </div>

                    {userOffers.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs bg-slate-950/30 rounded-2xl border border-slate-800/80">
                        কোনো লিস্টিং বা বই পাওয়া যায়নিॷ
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">বইয়ের নাম ও কোড</th>
                              <th className="py-2.5 px-3">মূল্য</th>
                              <th className="py-2.5 px-3">অবস্থা</th>
                              <th className="py-2.5 px-3">স্ট্যাটাস</th>
                              <th className="py-2.5 px-3">পিকআপ পয়েন্ট</th>
                              <th className="py-2.5 px-3 text-right">অ্যাকশন (Control)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {userOffers.map((offer) => (
                              <tr key={offer.id} className="hover:bg-slate-800/30">
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-white max-w-[200px] truncate">
                                    {offer.bookTitle}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-400">
                                    {offer.subjectCode} • {offer.department}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                                  ৳{offer.sellingPrice}
                                  <span className="text-[10px] text-slate-500 line-through ml-1.5 font-normal">
                                    ৳{offer.originalPrice}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
                                    {offer.condition}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      offer.availability === 'Available'
                                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                        : offer.availability === 'Reserved'
                                        ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}
                                  >
                                    {offer.availability}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-[140px]">
                                  {offer.pickupPointName || 'ক্যামপাঈ ডেস্ক'}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onOpenListingEdit({
                                          listingId: offer.id,
                                          bookId: offer.bookId,
                                          title: offer.bookTitle,
                                          subjectCode: offer.subjectCode,
                                          department: offer.department,
                                          sellerName: u.name,
                                          sellerRoll: u.rollNumber || u.studentId,
                                          sellerInstitute: u.institute,
                                          sellingPrice: offer.sellingPrice,
                                          originalPrice: offer.originalPrice,
                                          condition: offer.condition,
                                          conditionDetails: offer.conditionDetails || '',
                                          availability: offer.availability,
                                          pickupPointId: offer.pickupPointId || '',
                                          pickupPointName: offer.pickupPointName || '',
                                        })
                                      }
                                      className="p-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 transition-colors cursor-pointer"
                                      title="লিস্টিং সম্পাদন করুন"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newStatus: BookAvailability =
                                          offer.availability === 'Available' ? 'Reserved' : 'Available';
                                        void onToggleListingStatus(offer.id, newStatus);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-colors cursor-pointer"
                                      title="স্ট্যাটাস পরিবর্তন"
                                    >
                                      {offer.availability === 'Available' ? 'হোল্ড করুন' : 'উন্মুক্ত করুন'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void onDeleteListing(offer.id)}
                                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 transition-colors cursor-pointer"
                                      title="লিস্টিং মুছে ফেলুন"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => onNavigateToBook(offer.bookId)}
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                      title="বইয়ের পেজে যান"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ORDERS */}
                {activeUserTab === 'orders' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>এই ব্যবহারকারীর মোট {userOrders.length} টি কেনা-বেচার অর্ডার রয়েছে:</span>
                    </div>

                    {userOrders.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs bg-slate-950/30 rounded-2xl border border-slate-800/80">
                        কোনো অর্ডার বা লেনদেন পাওয়া যায়নিॷ
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {userOrders.map((ord) => {
                          const isBuyer = ord.buyer?.id === u.id;
                          return (
                            <div
                              key={ord.id}
                              className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        isBuyer
                                          ? 'bg-blue-950 border border-blue-800 text-blue-300'
                                          : 'bg-purple-950 border border-purple-800 text-purple-300'
                                      }`}
                                    >
                                      {isBuyer ? 'ক্রেতা হিসেবে' : 'বিক্রেতা হিসেবে'}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-400">
                                      #{ord.id.slice(0, 8)}
                                    </span>
                                  </div>
                                  <h5 className="font-bold text-white text-xs mt-1 truncate max-w-[220px]">
                                    {ord.book?.title || '\u09ac\u0987'}
                                  </h5>
                                </div>
                                <span className="text-xs font-mono font-bold text-emerald-400">
                                  ৳{ord.price}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                                <div>পিকআপ: {ord.pickupPoint?.name || '\u0995\u09cd\u09af\u09be\u09ae\u09aa\u09be\u09b8 \u09a1\u09c7\u09b8\u09cdক'}</div>
                                <div>তারিখ: {new Date(ord.createdAt).toLocaleDateString('bn-BD')}</div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                                  {ord.status}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onNavigateToOrder(ord.id)}
                                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <span>বিস্তারিত দেখুন</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: REQUESTS */}
                {activeUserTab === 'requests' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>এই ব্যবহারকারীর করা মোট {userRequests.length} টি বইয়ের অনুরোধ রয়েছে:</span>
                    </div>

                    {userRequests.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs bg-slate-950/30 rounded-2xl border border-slate-800/80">
                        কোনো অনুরোধ বা রিকোয়েস্ট পাওয়া যায়নিॷ
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {userRequests.map((req) => (
                          <div
                            key={req.id}
                            className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col justify-between space-y-2"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300">
                                  {req.requestType || 'General'}
                                </span>
                                {req.maxBudget && (
                                  <span className="text-xs font-mono font-bold text-emerald-400">
                                    বাজেট: ৳{req.maxBudget}
                                  </span>
                                )}
                              </div>
                              <h5 className="font-bold text-white text-xs mt-1.5">
                                {req.title}
                              </h5>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {req.department} • {req.semester}
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800/60 flex items-center justify-between">
                              <span>স্ট্যাটাস: {req.status}</span>
                              <span>{new Date(req.createdAt).toLocaleDateString('bn-BD')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

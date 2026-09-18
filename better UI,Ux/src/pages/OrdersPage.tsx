import React, { useState } from 'react';
import {
  ShoppingBag,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flag,
  XCircle,
  Star,
  Loader2,
  BadgeCheck,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Order, OrderStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { Button } from '../components/common/Button';
import { OrderTimeline } from '../components/OrderTimeline';
import { EmptyState } from '../components/common/EmptyState';

export const OrdersPage: React.FC = () => {
  const {
    orders,
    selectedOrderId,
    setSelectedOrderId,
    setActiveView,
    currentUser,
    fileDispute,
    user,
    openAuthModal,
    cancelOrder,
    submitReview,
    hasReviewedOrder,
  } = useMarketplace();

  if (!user) {
    return (
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-8 max-w-lg mx-auto text-center space-y-4 my-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#ef4d23]/10 text-[#ef4d23] flex items-center justify-center mx-auto">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0b0f1a]">অর্ডার দেখতে লগইন করুন</h2>
        <p className="text-sm text-neutral-500">
          আপনার কেনা এবং বিক্রির অর্ডার ট্র্যাক করতে আপনার অ্যাকাউন্টে লগইন করুন।
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="primary" onClick={() => openAuthModal('login', 'অর্ডার দেখতে লগইন করুন')}>
            লগইন করুন
          </Button>
          <Button variant="outline" onClick={() => setActiveView('browse')}>
            বই ব্রাউজ করুন
          </Button>
        </div>
      </div>
    );
  }

  const [filterTab, setFilterTab] = useState<'all' | 'purchases' | 'sales'>('all');
  const [reportModalOrder, setReportModalOrder] = useState<Order | null>(null);
  const [reportReason, setReportReason] = useState('Book Condition Discrepancy');
  const [reportDetails, setReportDetails] = useState('');

  // Cancellation state
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFeedback, setCancelFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Filter orders by tab
  const displayedOrders = orders.filter((order) => {
    if (filterTab === 'purchases') return order.buyer.id === currentUser.id;
    if (filterTab === 'sales') return order.seller.id === currentUser.id;
    return true;
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || displayedOrders[0];

  // An order may be cancelled by either participant until the book is handed over
  const canCancel = selectedOrder
    ? (selectedOrder.buyer.id === currentUser.id || selectedOrder.seller.id === currentUser.id) &&
      (selectedOrder.status === 'placed' || selectedOrder.status === 'confirmed')
    : false;

  const reviewCounterparty = selectedOrder
    ? selectedOrder.buyer.id === currentUser.id
      ? selectedOrder.seller
      : selectedOrder.buyer
    : null;

  const handleOpenDispute = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setReportModalOrder(order);
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setCancelSubmitting(true);
    const result = await cancelOrder(cancelTarget.id, cancelReason);
    setCancelSubmitting(false);
    setCancelFeedback({ type: result.success ? 'success' : 'error', message: result.message });

    if (result.success) {
      setTimeout(() => {
        setCancelTarget(null);
        setCancelReason('');
        setCancelFeedback(null);
      }, 1600);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setReviewSubmitting(true);
    const result = await submitReview(selectedOrder.id, reviewRating, reviewComment);
    setReviewSubmitting(false);
    setReviewFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    if (result.success) {
      setReviewComment('');
      setReviewRating(5);
    }
  };

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModalOrder) return;

    fileDispute(
      reportModalOrder.orderNumber,
      reportModalOrder.book.title,
      reportReason,
      reportDetails || 'Order issue reported by student'
    );
    setReportModalOrder(null);
    setReportDetails('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#ef4d23]">
            Campus Transactions
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b0f1a] tracking-tight mt-0.5">
            Orders & Pickup Verification
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Track textbook drop-offs, campus collection desks, and 4-digit PIN escrow verification
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-[#f5f2ee] rounded-full border border-[#e5e5e5] shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === 'all'
                ? 'bg-[#0b0f1a] text-white shadow-2xs'
                : 'text-neutral-600 hover:text-[#0b0f1a]'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setFilterTab('purchases')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === 'purchases'
                ? 'bg-[#0b0f1a] text-white shadow-2xs'
                : 'text-neutral-600 hover:text-[#0b0f1a]'
            }`}
          >
            My Purchases
          </button>
          <button
            onClick={() => setFilterTab('sales')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === 'sales'
                ? 'bg-[#0b0f1a] text-white shadow-2xs'
                : 'text-neutral-600 hover:text-[#0b0f1a]'
            }`}
          >
            My Sales
          </button>
        </div>
      </div>

      {displayedOrders.length === 0 ? (
        <EmptyState
          type="orders"
          title="You have no orders yet"
          description="Browse available books to find the textbooks you need for this semester."
          actionText="Browse Textbooks"
          onAction={() => setActiveView('browse')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Orders List (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Transaction Records
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                {displayedOrders.length} records
              </span>
            </div>

            <div className="space-y-3">
              {displayedOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                const isBuyer = order.buyer.id === currentUser.id;
                const counterparty = isBuyer ? order.seller : order.buyer;

                return (
                  <div
                    key={order.id}
                    id={`order-card-${order.id}`}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-white border-[#0b0f1a] shadow-md ring-2 ring-[#0b0f1a]/5'
                        : 'bg-white/80 border-[#e5e5e5] hover:bg-white hover:border-neutral-300'
                    }`}
                  >
                    {/* Top Order Number & Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#0b0f1a]">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.2 rounded-md ${
                            isBuyer
                              ? 'bg-sky-50 text-sky-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {isBuyer ? 'Purchased' : 'Sold by you'}
                        </span>
                      </div>
                      <StatusBadge status={order.status} size="sm" />
                    </div>

                    {/* Book Thumbnail & Information */}
                    <div className="flex items-center gap-3">
                      <img
                        src={order.book.images[0]}
                        alt={order.book.title}
                        className="w-12 h-14 rounded-lg object-cover shrink-0 border border-[#e5e5e5]"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm text-[#0b0f1a] truncate">
                          {order.book.title}
                        </h4>
                        <p className="text-[11px] text-neutral-500 truncate">
                          Code {order.book.subjectCode} • {order.book.department}
                        </p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="font-bold text-xs sm:text-sm text-[#0b0f1a]">
                            ৳{order.price}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {order.paymentState}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Pickup Point & Counterparty */}
                    <div className="mt-3 pt-2.5 border-t border-[#e5e5e5] flex items-center justify-between text-xs text-neutral-500">
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <MapPin className="w-3.5 h-3.5 text-[#ef4d23] shrink-0" />
                        <span className="truncate">{order.pickupPoint.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span>PIN:</span>
                        <span className="font-mono font-bold text-[#0b0f1a] bg-[#f5f2ee] px-1.5 py-0.2 rounded">
                          {order.verificationPin}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Details & Timeline (7 cols on lg) */}
          <div className="lg:col-span-7">
            {selectedOrder ? (
              <div className="space-y-6 sticky top-20">
                {/* Active Order Banner Card */}
                <div className="bg-white rounded-3xl border border-[#e5e5e5] p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e5e5e5]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-bold text-[#0b0f1a]">
                          Order #{selectedOrder.orderNumber}
                        </h2>
                        <StatusBadge status={selectedOrder.status} size="md" />
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Created {selectedOrder.createdAt} • Updated {selectedOrder.updatedAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {canCancel && (
                        <button
                          onClick={() => { setCancelTarget(selectedOrder); setCancelFeedback(null); }}
                          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-rose-600 bg-[#f5f2ee] hover:bg-rose-50 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Order</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => handleOpenDispute(e, selectedOrder)}
                        className="flex items-center gap-1 text-xs text-neutral-500 hover:text-rose-600 bg-[#f5f2ee] hover:bg-rose-50 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>File Dispute</span>
                      </button>
                    </div>
                  </div>

                  {/* Counterparty & Book Snapshot */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-[#f5f2ee] border border-[#e5e5e5] space-y-1">
                      <span className="font-semibold text-neutral-400 block uppercase text-[10px]">
                        Seller Information
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <UserAvatar
                          src={selectedOrder.seller.avatar}
                          name={selectedOrder.seller.name}
                          size="sm"
                          isVerified={selectedOrder.seller.isVerified}
                        />
                        <div>
                          <p className="font-bold text-[#0b0f1a]">
                            {selectedOrder.seller.name}
                          </p>
                          <p className="text-neutral-500 text-[11px]">
                            {selectedOrder.seller.department}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#f5f2ee] border border-[#e5e5e5] space-y-1">
                      <span className="font-semibold text-neutral-400 block uppercase text-[10px]">
                        Buyer Information
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <UserAvatar
                          src={selectedOrder.buyer.avatar}
                          name={selectedOrder.buyer.name}
                          size="sm"
                          isVerified={selectedOrder.buyer.isVerified}
                        />
                        <div>
                          <p className="font-bold text-[#0b0f1a]">
                            {selectedOrder.buyer.name}
                          </p>
                          <p className="text-neutral-500 text-[11px]">
                            {selectedOrder.buyer.department}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price & Escrow Status */}
                  <div className="p-3.5 rounded-2xl bg-white border border-[#e5e5e5] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-neutral-400">Total Escrow Amount</span>
                      <p className="text-lg font-bold text-[#0b0f1a]">
                        ৳{selectedOrder.price}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-neutral-400">Payment Status</span>
                      <p className="text-xs font-semibold text-emerald-700">
                        {selectedOrder.paymentState}
                      </p>
                    </div>
                  </div>

                  {selectedOrder.status === 'cancelled' && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-0.5">
                      <p className="font-semibold">This order was cancelled</p>
                      <p className="opacity-90">
                        {selectedOrder.cancelReason || 'Cancelled by a participant.'} Escrow has been
                        refunded in full.
                      </p>
                    </div>
                  )}
                </div>

                {/* The Modern 6-Stage Timeline Component */}
                <OrderTimeline order={selectedOrder} />

                {/* Post-pickup review — only for verified (completed) transactions */}
                {selectedOrder.status === 'completed' && (
                  <div className="bg-white rounded-3xl border border-[#e5e5e5] p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-[#e5e5e5]">
                      <Star className="w-5 h-5 text-amber-500" />
                      <h3 className="text-base font-bold text-[#0b0f1a]">
                        Rate This Transaction
                      </h3>
                    </div>

                    {reviewCounterparty && (
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={reviewCounterparty.avatar}
                          name={reviewCounterparty.name}
                          size="sm"
                          isVerified={reviewCounterparty.isVerified}
                        />
                        <div>
                          <p className="text-sm font-semibold text-[#0b0f1a]">
                            {reviewCounterparty.name}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {selectedOrder.buyer.id === currentUser.id ? 'Seller' : 'Buyer'} •{' '}
                            {reviewCounterparty.department}
                          </p>
                        </div>
                      </div>
                    )}

                    {hasReviewedOrder(selectedOrder.id) ? (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                        <BadgeCheck className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                          You already reviewed this transaction. Your rating is part of the campus
                          trust score.
                        </span>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReview} className="space-y-3">
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setReviewRating(value)}
                              aria-label={`${value} star`}
                              className="cursor-pointer"
                            >
                              <Star
                                className={`w-7 h-7 transition-colors ${
                                  value <= reviewRating
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-neutral-300'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs font-semibold text-neutral-500 ml-1">
                            {reviewRating}.0 / 5.0
                          </span>
                        </div>

                        <textarea
                          rows={3}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Was the book condition as described? Was the handover smooth?"
                          className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl p-3 text-xs text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] focus:bg-white"
                        />

                        {reviewFeedback && (
                          <div
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                              reviewFeedback.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-red-50 text-red-800 border-red-200'
                            }`}
                          >
                            {reviewFeedback.type === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            )}
                            <span>{reviewFeedback.message}</span>
                          </div>
                        )}

                        <Button
                          type="submit"
                          variant="dark"
                          size="sm"
                          disabled={reviewSubmitting}
                          icon={reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                        >
                          {reviewSubmitting ? 'Publishing…' : 'Publish Verified Review'}
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#e5e5e5]">
                <p className="text-neutral-500 text-sm">Select an order on the left to view details and timeline.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <form
            onSubmit={handleCancelOrder}
            className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
              <h3 className="text-base font-bold text-[#0b0f1a] flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Cancel Order #{cancelTarget.orderNumber}</span>
              </h3>
              <button
                type="button"
                onClick={() => { setCancelTarget(null); setCancelFeedback(null); }}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#f5f2ee] border border-[#e5e5e5] text-xs text-neutral-600 space-y-1">
              <p className="font-semibold text-[#0b0f1a]">{cancelTarget.book.title}</p>
              <p>
                Escrow of ৳{cancelTarget.price} will be refunded and the listing returns to the
                marketplace. This cannot be undone once the book is handed over at the pickup desk.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">
                Reason (visible to the other student)
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl p-2.5 text-xs text-[#0b0f1a]"
              >
                <option value="">Select a reason…</option>
                <option value="Changed my mind">Changed my mind</option>
                <option value="Found the book elsewhere">Found the book elsewhere</option>
                <option value="Semester changed / no longer needed">Semester changed / no longer needed</option>
                <option value="Could not reach the pickup point in time">Could not reach the pickup point in time</option>
                <option value="Seller unresponsive">Seller unresponsive</option>
              </select>
            </div>

            {cancelFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  cancelFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {cancelFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span>{cancelFeedback.message}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => { setCancelTarget(null); setCancelFeedback(null); }}
              >
                Keep Order
              </Button>
              <Button
                type="submit"
                variant="danger"
                fullWidth
                size="sm"
                disabled={cancelSubmitting}
                icon={cancelSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {cancelSubmitting ? 'Cancelling…' : 'Confirm Cancellation'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* File Dispute Modal */}
      {reportModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <form
            onSubmit={handleSubmitDispute}
            className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
              <h3 className="text-base font-bold text-[#0b0f1a] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Open Order Dispute</span>
              </h3>
              <button
                type="button"
                onClick={() => setReportModalOrder(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              If the textbook does not match the described condition or the seller did not drop off on time, open a dispute. Campus desk escrow will pause payout.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">
                Dispute Reason
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl p-2.5 text-xs text-[#0b0f1a]"
              >
                <option value="Book Condition Discrepancy">Book Condition Discrepancy</option>
                <option value="Missing Pages or Wrong Edition">Missing Pages or Wrong Edition</option>
                <option value="Drop-off Timeout">Drop-off Timeout (No book delivered)</option>
                <option value="Wrong PIN / Handover Error">Wrong PIN / Handover Error</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">
                Detailed Explanation
              </label>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe what was missing or incorrect..."
                className="w-full bg-white border border-[#e5e5e5] rounded-xl p-2.5 text-xs text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23]"
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => setReportModalOrder(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                fullWidth
                size="sm"
              >
                Submit Dispute to Admin
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

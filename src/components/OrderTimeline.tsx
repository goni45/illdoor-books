import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { Order } from '../types';
import { useMarketplace } from '../context/MarketplaceContext';
import { Button } from './common/Button';

interface OrderTimelineProps {
  order: Order;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ order }) => {
  const { verifyPickupPin, user, isAdmin } = useMarketplace();
  const isBuyer = user?.id === order.buyer.id;
  const canSeePin = isBuyer || isAdmin;
  const [pinInput, setPinInput] = useState('');
  const [pinFeedback, setPinFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    const result = await verifyPickupPin(order.id, pinInput);
    if (result.success) {
      setPinFeedback({ type: 'success', message: result.message });
      setPinInput('');
    } else {
      setPinFeedback({ type: 'error', message: result.message });
    }
  };

  const timelineStages = Array.isArray(order.timeline) && order.timeline.length > 0
    ? order.timeline
    : [
        { status: 'placed' as const, label: 'Order Placed', timestamp: order.createdAt || 'Done', note: `Pickup: ${order.pickupPoint?.name || 'Campus Station'}`, isCompleted: order.status !== 'placed', isCurrent: order.status === 'placed' },
        { status: 'confirmed' as const, label: 'Payment Confirmed', timestamp: order.status !== 'placed' ? 'Done' : 'Pending', note: 'Escrow payment held securely', isCompleted: ['dropped_off', 'ready_for_pickup', 'picked_up', 'completed'].includes(order.status), isCurrent: order.status === 'confirmed' },
        { status: 'dropped_off' as const, label: 'Seller Drop-off', timestamp: ['dropped_off', 'ready_for_pickup', 'picked_up', 'completed'].includes(order.status) ? 'Done' : 'Pending', note: 'Seller hands textbook to booth', isCompleted: ['ready_for_pickup', 'picked_up', 'completed'].includes(order.status), isCurrent: order.status === 'dropped_off' },
        { status: 'ready_for_pickup' as const, label: 'Ready for Pickup', timestamp: ['ready_for_pickup', 'picked_up', 'completed'].includes(order.status) ? 'Done' : 'Pending', note: 'Book verified by booth staff', isCompleted: ['picked_up', 'completed'].includes(order.status), isCurrent: order.status === 'ready_for_pickup' },
        { status: 'picked_up' as const, label: 'Book Picked Up', timestamp: ['picked_up', 'completed'].includes(order.status) ? 'Done' : 'Pending', note: 'Buyer verifies with PIN', isCompleted: order.status === 'completed', isCurrent: order.status === 'picked_up' },
        { status: 'completed' as const, label: 'Transaction Completed', timestamp: order.status === 'completed' ? 'Done' : 'Pending', note: 'Funds disbursed to seller', isCompleted: order.status === 'completed', isCurrent: order.status === 'completed' },
      ];

  return (
    <div className="space-y-6">
      {/* Pickup Verification Security Box */}
      <div className="bg-white rounded-2xl border border-[#e5e5e5] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e5e5]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ef4d23]">
              Campus Escrow & Handover
            </span>
            <h3 className="text-base font-bold text-[#0b0f1a] flex items-center gap-2 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>4-Digit Verification PIN</span>
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-[#0b0f1a] text-white rounded-xl font-mono text-lg font-bold tracking-widest text-center shadow-xs">
              {canSeePin ? order.verificationPin : '••••'}
            </div>
            <span className="text-xs text-neutral-500 max-w-[140px] leading-tight">
              {canSeePin ? 'Show this PIN to campus desk staff upon collection' : 'The pickup PIN is visible only to the buyer and campus desk'}
            </span>
          </div>
        </div>

        {/* Pickup Station Details */}
        <div className="mt-4 flex items-start gap-3 bg-[#f5f2ee] rounded-xl p-3 text-xs sm:text-sm text-neutral-700">
          <MapPin className="w-4 h-4 text-[#ef4d23] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[#0b0f1a]">
              {order.pickupPoint?.name || 'Central Campus Library Desk'}
            </p>
            <p className="text-neutral-500">{order.pickupPoint?.locationDetail || 'Ground floor verification counter'}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 pt-1">
              <span>⏰ {order.pickupPoint?.operatingHours || 'Sun - Thu: 9:00 AM - 4:30 PM'}</span>
              <span>📞 {order.pickupPoint?.contactPerson || 'Campus Desk Agent'} ({order.pickupPoint?.phone || '+880 1711-000000'})</span>
            </div>
          </div>
        </div>

        {/* PIN verification simulation box (e.g. for student/desk agent) */}
        {isAdmin && order.status !== 'completed' && order.status !== 'cancelled' && (
          <form
            onSubmit={handleVerify}
            className="mt-4 pt-3 border-t border-[#e5e5e5] flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 4-digit PIN to confirm pickup"
                className="w-full bg-white border border-[#e5e5e5] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm font-mono tracking-wider focus:outline-none focus:border-[#ef4d23]"
              />
            </div>
            <Button
              type="submit"
              variant="dark"
              size="sm"
              disabled={pinInput.length < 4}
            >
              Verify Pickup Handover
            </Button>
          </form>
        )}

        {pinFeedback.message && (
          <div
            className={`mt-2 text-xs p-2.5 rounded-xl flex items-center gap-2 ${
              pinFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {pinFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{pinFeedback.message}</span>
          </div>
        )}
      </div>

      {/* 6-Stage Timeline */}
      <div className="bg-white rounded-2xl border border-[#e5e5e5] p-5 sm:p-6 shadow-xs">
        <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-6">
          Order Progress Timeline
        </h4>

        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-[#e5e5e5]">
          {timelineStages.map((stage, idx) => {
            const isFinished = stage.isCompleted;
            const isCurrent = stage.isCurrent;

            return (
              <div key={idx} className="relative group">
                {/* Stage marker */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isFinished
                      ? 'bg-emerald-500 border-white text-white shadow-xs'
                      : isCurrent
                      ? 'bg-[#ef4d23] border-white text-white shadow-xs ring-4 ring-[#ef4d23]/20 animate-pulse'
                      : 'bg-white border-[#e5e5e5] text-neutral-300'
                  }`}
                >
                  {isFinished ? (
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  ) : (
                    <span className="text-[10px] sm:text-xs font-bold font-mono">
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Stage info */}
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <h5
                      className={`text-sm sm:text-base font-semibold ${
                        isCurrent
                          ? 'text-[#ef4d23]'
                          : isFinished
                          ? 'text-[#0b0f1a]'
                          : 'text-neutral-400'
                      }`}
                    >
                      {stage.label}
                    </h5>
                    <span className="text-xs text-neutral-400 font-mono">
                      {stage.timestamp}
                    </span>
                  </div>
                  <p
                    className={`text-xs sm:text-sm mt-0.5 ${
                      isCurrent ? 'text-neutral-700 font-medium' : 'text-neutral-500'
                    }`}
                  >
                    {stage.note}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

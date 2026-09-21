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
        { status: 'placed' as const, label: 'অর্ডার সম্পন্ন', timestamp: order.createdAt || 'সম্পন্ন', note: `পিকআপ: ${order.pickupPoint?.name || 'ক্যাম্পাস স্টেশন'}`, isCompleted: order.status !== 'placed', isCurrent: order.status === 'placed' },
        { status: 'confirmed' as const, label: 'পেমেন্ট নিশ্চিত', timestamp: order.status !== 'placed' ? 'সম্পন্ন' : 'অপেক্ষমাণ', note: 'এসক্রো পেমেন্ট সুরক্ষিত রাখা হয়েছে', isCompleted: ['dropped_off', 'ready_for_pickup', 'picked_up', 'completed'].includes(order.status), isCurrent: order.status === 'confirmed' },
        { status: 'dropped_off' as const, label: 'বিক্রেতা ড্রপ-অফ', timestamp: ['dropped_off', 'ready_for_pickup', 'picked_up', 'completed'].includes(order.status) ? 'সম্পন্ন' : 'অপেক্ষমাণ', note: 'বিক্রেতা বুথে বই জমা দিয়েছেন', isCompleted: ['ready_for_pickup', 'picked_up', 'completed'].includes(order.status), isCurrent: order.status === 'dropped_off' },
        { status: 'ready_for_pickup' as const, label: 'সংগ্রহের জন্য প্রস্তুত', timestamp: ['ready_for_pickup', 'picked_up', 'completed'].includes(order.status) ? 'সম্পন্ন' : 'অপেক্ষমাণ', note: 'বুথ স্টাফ দ্বারা বই যাচাই সম্পন্ন', isCompleted: ['picked_up', 'completed'].includes(order.status), isCurrent: order.status === 'ready_for_pickup' },
        { status: 'picked_up' as const, label: 'বই সংগ্রহ সম্পন্ন', timestamp: ['picked_up', 'completed'].includes(order.status) ? 'সম্পন্ন' : 'অপেক্ষমাণ', note: 'ক্রেতা পিন যাচাই করে বই বুঝে নিয়েছেন', isCompleted: order.status === 'completed', isCurrent: order.status === 'picked_up' },
        { status: 'completed' as const, label: 'লেনদেন সমাপ্ত', timestamp: order.status === 'completed' ? 'সম্পন্ন' : 'অপেক্ষমাণ', note: 'বিক্রেতার ওয়ালেটে অর্থ প্রদান করা হয়েছে', isCompleted: order.status === 'completed', isCurrent: order.status === 'completed' },
      ];

  return (
    <div className="space-y-6">
      {/* Pickup Verification Security Box */}
      <div className="bg-white rounded-2xl border border-[#e5e5e5] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e5e5]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ef4d23]">
              ক্যাম্পাস এসক্রো ও হস্তান্তর
            </span>
            <h3 className="text-base font-bold text-[#0b0f1a] flex items-center gap-2 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>৪-ডিজিট ভেরিফিকেশন পিন</span>
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-[#0b0f1a] text-white rounded-xl font-mono text-lg font-bold tracking-widest text-center shadow-xs">
              {canSeePin ? order.verificationPin : '••••'}
            </div>
            <span className="text-xs text-neutral-500 max-w-[140px] leading-tight">
              {canSeePin ? 'বই সংগ্রহের সময় ক্যাম্পাস ডেস্কে এই পিনটি দেখান' : 'পিকআপ পিন শুধুমাত্র ক্রেতা ও ক্যাম্পাস ডেস্কের নিকট দৃশ্যমান'}
            </span>
          </div>
        </div>

        {/* Pickup Station / Seller Place Details */}
        {order.pickupType === 'seller_place' || order.sellerPlaceAddress || (order.pickupPoint?.id === 'seller_place') ? (
          <div className="mt-4 flex items-start gap-3 bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 text-xs sm:text-sm text-amber-950">
            <MapPin className="w-5 h-5 text-[#ef4d23] shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#0b0f1a]">
                  সেলার-এর স্থান থেকে পিকআপ (Pick up from seller's place)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900">
                  সরাসরি হস্তান্তর
                </span>
              </div>
              <p className="text-neutral-800 text-xs font-semibold">
                📍 <b>ঠিকানা / স্থান:</b> {order.sellerPlaceAddress || order.pickupPoint?.locationDetail || order.pickupPoint?.name || 'সেলার নির্ধারিত স্থান বা বাসা'}
              </p>
              <p className="text-neutral-600 text-[11px] leading-relaxed">
                ক্রেতা সেলারের সাথে নির্ধারিত সময়ে উল্লেখিত স্থানে সাক্ষাৎ করে বই বুঝে নেবেন এবং ৪-ডিজিটের পিন প্রদান করবেন।
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-700 pt-1 border-t border-amber-200/70">
                <span>👤 সেলার: <b>{order.seller.name}</b> ({order.seller.department})</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-3 bg-[#f5f2ee] rounded-xl p-3 text-xs sm:text-sm text-neutral-700">
            <MapPin className="w-4 h-4 text-[#ef4d23] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-[#0b0f1a]">
                {order.pickupPoint?.name || 'সেন্ট্রাল ক্যাম্পাস লাইব্রেরি ডেস্ক'}
              </p>
              <p className="text-neutral-500">{order.pickupPoint?.locationDetail || 'গ্রাউন্ড ফ্লোর ভেরিফিকেশন কাউন্টার'}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 pt-1">
                <span>⏰ {order.pickupPoint?.operatingHours || 'রবি - বৃহস্পতি: সকাল ৯:০০ - বিকাল ৪:৩০'}</span>
                <span>📞 {order.pickupPoint?.contactPerson || 'ক্যাম্পাস ডেস্ক প্রতিনিধি'} ({order.pickupPoint?.phone || '+880 1711-000000'})</span>
              </div>
            </div>
          </div>
        )}

        {/* PIN verification box (for desk agent, admin, or seller in case of seller_place) */}
        {(isAdmin || (order.pickupType === 'seller_place' && user?.id === order.seller.id)) && order.status !== 'completed' && order.status !== 'cancelled' && (
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
                placeholder="ক্রেতার ৪-ডিজিট পিন লিখে হস্তান্তর সম্পন্ন করুন"
                className="w-full bg-white border border-[#e5e5e5] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm font-mono tracking-wider focus:outline-none focus:border-[#ef4d23]"
              />
            </div>
            <Button
              type="submit"
              variant="dark"
              size="sm"
              disabled={pinInput.length < 4}
            >
              পিকআপ যাচাই করুন
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
          অর্ডারের অগ্রগতি টাইমলাইন
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

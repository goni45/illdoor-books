import React from 'react';
import { BookAvailability, OrderStatus } from '../../types';

interface StatusBadgeProps {
  status: BookAvailability | OrderStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let style = 'bg-neutral-100 text-neutral-700 border-neutral-200';
  let label = status;

  switch (status) {
    case 'Available':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      label = 'উপলব্ধ';
      break;
    case 'Reserved':
      style = 'bg-amber-50 text-amber-800 border-amber-200/80';
      label = 'সংরক্ষিত';
      break;
    case 'Sold':
      style = 'bg-neutral-100 text-neutral-500 border-neutral-200';
      label = 'বিক্রি হয়েছে';
      break;
    case 'Inactive':
      style = 'bg-slate-100 text-slate-600 border-slate-300';
      label = 'নিষ্ক্রিয়';
      break;
    case 'Unavailable':
      style = 'bg-rose-50 text-rose-700 border-rose-200';
      label = 'অনুপলব্ধ';
      break;
    case 'placed':
      style = 'bg-sky-50 text-sky-700 border-sky-200/80';
      label = 'অর্ডার হয়েছে';
      break;
    case 'confirmed':
      style = 'bg-blue-50 text-blue-700 border-blue-200/80';
      label = 'এসক্রো নিশ্চিত';
      break;
    case 'dropped_off':
      style = 'bg-purple-50 text-purple-700 border-purple-200/80';
      label = 'ড্রপ-অফ সম্পন্ন';
      break;
    case 'ready_for_pickup':
      style = 'bg-[#ef4d23]/10 text-[#ef4d23] border-[#ef4d23]/30 font-semibold';
      label = 'পিকআপের জন্য প্রস্তুত';
      break;
    case 'picked_up':
      style = 'bg-teal-50 text-teal-700 border-teal-200/80';
      label = 'সংগ্রহ করা হয়েছে';
      break;
    case 'completed':
      style = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
      label = 'সম্পন্ন';
      break;
    case 'cancelled':
      style = 'bg-rose-50 text-rose-700 border-rose-200';
      label = 'বাতিল';
      break;
    case 'disputed':
      style = 'bg-amber-50 text-amber-800 border-amber-300';
      label = 'আপত্তি বিবেচনাধীন';
      break;
    default:
      break;
  }

  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full whitespace-nowrap ${style} ${sizeClass}`}
    >
      {label}
    </span>
  );
};

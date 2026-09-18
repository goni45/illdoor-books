import React from 'react';
import { Condition } from '../../types';

interface ConditionBadgeProps {
  condition: Condition;
  size?: 'sm' | 'md';
}

export const ConditionBadge: React.FC<ConditionBadgeProps> = ({ condition, size = 'md' }) => {
  const styles: Record<Condition, string> = {
    'Like New': 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    'Good': 'bg-sky-50 text-sky-800 border-sky-200/80',
    'Used': 'bg-amber-50 text-amber-800 border-amber-200/80',
    'Heavily Used': 'bg-rose-50 text-rose-800 border-rose-200/80',
  };

  const sizeClass =
    size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-md whitespace-nowrap ${styles[condition]} ${sizeClass}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {condition}
    </span>
  );
};

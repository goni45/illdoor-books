import React from 'react';
import { BookOpen, Bookmark, ShoppingBag, Bell, Search } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  type?: 'search' | 'wishlist' | 'orders' | 'notifications' | 'generic';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'generic',
  title,
  description,
  actionText,
  onAction,
}) => {
  const icons = {
    search: <Search className="w-8 h-8 text-neutral-400" />,
    wishlist: <Bookmark className="w-8 h-8 text-neutral-400" />,
    orders: <ShoppingBag className="w-8 h-8 text-neutral-400" />,
    notifications: <Bell className="w-8 h-8 text-neutral-400" />,
    generic: <BookOpen className="w-8 h-8 text-neutral-400" />,
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white/70 rounded-2xl border border-[#e5e5e5]">
      <div className="w-16 h-16 rounded-full bg-[#f5f2ee] flex items-center justify-center mb-4">
        {icons[type]}
      </div>
      <h3 className="text-lg font-semibold text-[#0b0f1a] mb-1.5">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="dark" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

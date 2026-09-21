import React from 'react';
import { Search, Bell, ShoppingBag, Heart, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  type?: 'search' | 'notifications' | 'orders' | 'wishlist' | 'cart' | 'general';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'general',
  title,
  description,
  actionText,
  onAction,
  icon,
  className = '',
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'search':
        return <Search className="w-8 h-8 text-[#ef4d23]" />;
      case 'notifications':
        return <Bell className="w-8 h-8 text-[#ef4d23]" />;
      case 'orders':
        return <ShoppingBag className="w-8 h-8 text-[#ef4d23]" />;
      case 'wishlist':
        return <Heart className="w-8 h-8 text-[#ef4d23]" />;
      case 'cart':
        return <BookOpen className="w-8 h-8 text-[#ef4d23]" />;
      default:
        return <AlertCircle className="w-8 h-8 text-[#ef4d23]" />;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-3xl border border-neutral-100 max-w-lg mx-auto ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-[#ef4d23]/10 flex items-center justify-center mb-4 text-[#ef4d23]">
        {icon || getDefaultIcon()}
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-[#0b0f1a] mb-2">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-sm leading-relaxed mb-6">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

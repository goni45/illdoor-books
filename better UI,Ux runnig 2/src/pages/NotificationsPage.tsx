import React from 'react';
import {
  Bell,
  CheckCheck,
  PackageCheck,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setActiveView,
    navigateToOrder,
    navigateToBook,
  } = useMarketplace();

  const handleNotificationClick = (notif: (typeof notifications)[0]) => {
    markNotificationAsRead(notif.id);
    if (notif.linkRoute === 'orders' && notif.linkId) {
      navigateToOrder(notif.linkId);
    } else if (notif.linkRoute === 'book-details' && notif.linkId) {
      navigateToBook(notif.linkId);
    } else if (notif.linkRoute === 'book-details' && notif.linkId) {
      navigateToBook(notif.linkId);
    } else if (notif.linkRoute) {
      setActiveView(notif.linkRoute as any);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pickup':
        return <PackageCheck className="w-5 h-5 text-[#ef4d23]" />;
      case 'verification':
        return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case 'dispute':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'order':
        return <Bell className="w-5 h-5 text-sky-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-purple-600" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#ef4d23]">
            Campus Activity Updates
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b0f1a] tracking-tight mt-0.5">
            Notifications Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Order progress, pickup PIN alerts, and student verification status
          </p>
        </div>

        {notifications.some((n) => !n.read) && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllNotificationsAsRead}
            icon={<CheckCheck className="w-4 h-4" />}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notif) => {
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                  !notif.read
                    ? 'bg-white border-[#ef4d23]/40 shadow-xs ring-1 ring-[#ef4d23]/10'
                    : 'bg-white/80 border-[#e5e5e5] hover:bg-white hover:border-neutral-300'
                }`}
              >
                {/* Icon Container */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                    !notif.read
                      ? 'bg-[#f5f2ee] border-[#ef4d23]/20 shadow-2xs'
                      : 'bg-neutral-100 border-[#e5e5e5]'
                  }`}
                >
                  {getIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <h3
                      className={`text-sm font-semibold truncate ${
                        !notif.read ? 'text-[#0b0f1a]' : 'text-neutral-700'
                      }`}
                    >
                      {notif.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{notif.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
                    {notif.message}
                  </p>

                  {notif.linkRoute && (
                    <div className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-[#ef4d23] hover:underline">
                      <span>View details</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {!notif.read && (
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-[#ef4d23] shrink-0 mt-1.5"
                    title="Unread"
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          type="notifications"
          title="No notifications yet"
          description="You'll be alerted here when someone buys your book or when a book is ready for pickup."
          actionText="Explore Marketplace"
          onAction={() => setActiveView('browse')}
        />
      )}
    </div>
  );
};

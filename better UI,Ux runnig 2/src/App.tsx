import React, { useEffect, lazy, Suspense } from 'react';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BottomGlassNav } from './components/common/BottomGlassNav';
import { HomePage } from './pages/HomePage';
import { BrowsePage } from './pages/BrowsePage';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from './components/common/Button';
import { AlertTriangle } from 'lucide-react';
import { supabaseConfigError } from './lib/supabase';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';

const BookDetailsPage = lazy(() => import('./pages/BookDetailsPage').then((m) => ({ default: m.BookDetailsPage })));
const SellBookPage = lazy(() => import('./pages/SellBookPage').then((m) => ({ default: m.SellBookPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const WishlistPage = lazy(() => import('./pages/WishlistPage').then((m) => ({ default: m.WishlistPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const RequestsPage = lazy(() => import('./pages/RequestsPage').then((m) => ({ default: m.RequestsPage })));

// ─── Loading screen while auth initializes ───────────────────────────────────
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#fff4f0] via-[#fef6ef] to-[#fff9f0]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ef4d23] to-[#ff7a45] flex items-center justify-center shadow-lg shadow-[#ef4d23]/30">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      <p className="text-sm text-[#6b7280] font-medium">লোড হচ্ছে...</p>
    </div>
  </div>
);

// ─── Admin gate (console is only reachable with the profiles.is_admin flag) ──
const AdminAccessDenied: React.FC = () => {
  const { setActiveView, openAuthModal, isAuthenticated } = useMarketplace();

  return (
    <div className="bg-white rounded-3xl border border-[#e5e5e5] p-8 max-w-lg mx-auto text-center space-y-4 my-12 shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-[#ef4d23]/10 text-[#ef4d23] flex items-center justify-center mx-auto">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-[#0b0f1a]">Campus Desk Access Only</h2>
      <p className="text-sm text-neutral-500">
        {isAuthenticated
          ? 'This operations console is reserved for verified campus desk staff accounts. Ask the marketplace admin to grant your account staff access.'
          : 'The operations console is reserved for campus desk staff. Please log in with a staff account.'}
      </p>
      <div className="flex justify-center gap-3 pt-2">
        {!isAuthenticated && (
          <Button variant="primary" onClick={() => openAuthModal('login', 'Campus desk staff login')}>
            Staff Login
          </Button>
        )}
        <Button variant="outline" onClick={() => setActiveView('home')}>
          Back to Marketplace
        </Button>
      </div>
    </div>
  );
};

// ── Inner app (uses marketplace context) ────────────────────────────────────
const MarketplaceContent: React.FC = () => {
  const {
    activeView,
    isAuthModalOpen,
    authModalTab,
    authModalMessage,
    closeAuthModal,
    isAdmin,
    setActiveView,
    setSelectedBookId,
    setSelectedOrderId,
  } = useMarketplace();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('book');
    const orderId = params.get('order');
    const view = params.get('view');
    const allowedViews = new Set([
      'home',
      'browse',
      'book-details',
      'sell',
      'orders',
      'wishlist',
      'requests',
      'notifications',
      'profile',
      'admin',
    ]);
    if (bookId) {
      setSelectedBookId(bookId);
      setActiveView('book-details');
    } else if (orderId) {
      setSelectedOrderId(orderId);
      setActiveView('orders');
    } else if (view && allowedViews.has(view)) {
      setActiveView(view as typeof activeView);
    }
  }, [setActiveView, setSelectedBookId, setSelectedOrderId]);

  // Scroll to top whenever view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeView]);

  return (
    <div className="min-h-screen flex flex-col bg-[#ededed] text-[#0b0f1a] font-sans antialiased relative overflow-x-hidden p-2.5 sm:p-4">
      {/* Ambient Flowing Light Wave Animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="ambient-wave-beam" />
      </div>

      {/* Floating Modern Navbar (only on sub-pages; home has it in the hero) */}
      {activeView !== 'home' && (
        <header className="flex justify-center w-full mb-4 sm:mb-6 pointer-events-none">
          <div className="w-full flex justify-center pointer-events-auto">
            <Navbar />
          </div>
        </header>
      )}

      {/* Main Page Content */}
      <main className={`relative z-10 flex-1 w-full ${
        activeView === 'home'
          ? ''
          : 'max-w-7xl mx-auto px-2 sm:px-4 pb-12'
      }`}>
        <Suspense fallback={
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#ef4d23] animate-spin" />
            <p className="text-xs text-neutral-400 font-mono">Loading page...</p>
          </div>
        }>
          {activeView === 'home' && <HomePage />}
          {activeView === 'browse' && <BrowsePage />}
          {activeView === 'book-details' && <BookDetailsPage />}
          {activeView === 'sell' && <SellBookPage />}
          {activeView === 'orders' && <OrdersPage />}
          {activeView === 'wishlist' && <WishlistPage />}
          {activeView === 'requests' && <RequestsPage />}
          {activeView === 'notifications' && <NotificationsPage />}
          {activeView === 'profile' && <ProfilePage />}
          {activeView === 'admin' && (isAdmin ? <AdminDashboard /> : <AdminAccessDenied />)}
        </Suspense>
      </main>

      {/* Bottom Floating Glass Navigation Dock */}
      <BottomGlassNav />

      {/* Footer */}
      {activeView !== 'admin' && (
        <div className="relative z-10">
          <Footer />
        </div>
      )}

      {/* Auth Modal Triggered on Demand (e.g. Buy Now / Sell) */}
      {isAuthModalOpen && (
        <AuthPage
          isModal
          initialTab={authModalTab}
          message={authModalMessage}
          onClose={closeAuthModal}
        />
      )}
    </div>
  );
};

// ─── Auth gate wrapper (Public access for guests) ────────────────────────────
const AppContent: React.FC = () => {
  const { loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <MarketplaceProvider>
      <MarketplaceContent />
    </MarketplaceProvider>
  );
};

// ─── Root App (auth context lives here, marketplace inside) ─────────────────
const ConfigurationScreen=()=> <main className="min-h-screen bg-[#ededed] p-6 flex items-center justify-center"><section className="max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center"><AlertTriangle className="mx-auto text-amber-600"/><h1 className="mt-4 text-xl font-bold">Supabase setup required</h1><p className="mt-2 text-sm text-neutral-600">The app is healthy, but its public Supabase environment variables are missing.</p><ol className="mt-5 rounded-2xl bg-amber-50 p-4 text-left text-sm"><li>1. Copy .env.example to .env.local.</li><li>2. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</li><li>3. Restart or rebuild.</li></ol><p className="mt-4 text-xs text-neutral-500">{supabaseConfigError}</p></section></main>;
export function App(){if(supabaseConfigError)return <ConfigurationScreen/>;return <AppErrorBoundary><AuthProvider><AppContent/></AuthProvider></AppErrorBoundary>}

export default App;

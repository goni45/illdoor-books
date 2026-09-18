import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveView,
  BookListing,
  BookRequest,
  DisputeReport,
  FilterState,
  NotificationItem,
  Order,
  OrderStatus,
  PickupPoint,
  Review,
  StudentUser,
  VerificationRequest,
} from '../types';
import { DEPARTMENTS, SEMESTERS, CONDITIONS, PICKUP_POINTS as FALLBACK_PICKUP_POINTS, INITIAL_BOOKS, INITIAL_BOOK_REQUESTS } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { User } from '@supabase/supabase-js';

export { DEPARTMENTS, SEMESTERS, CONDITIONS };

// ─── helpers ────────────────────────────────────────────────────────────────

function mapDbProfileToStudentUser(prof: Record<string, unknown> | null, fallbackId: string = ''): StudentUser {
  if (!prof) {
    return {
      id: fallbackId, name: 'Student', email: '', studentId: '',
      institute: '', department: '', semester: '', avatar: '', isVerified: false,
      joinedDate: '', rating: 0, totalSales: 0, totalPurchases: 0,
    };
  }
  return {
    id: (prof.id as string) || fallbackId,
    name: (prof.full_name as string) || 'Student',
    email: (prof.email as string) || '',
    studentId: (prof.student_roll as string) || '',
    institute: (prof.institute as string) || '',
    department: (prof.department as string) || '',
    semester: (prof.semester as string) || '',
    avatar: (prof.avatar_url as string) ||
      `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent((prof.full_name as string) || 'Student')}&backgroundColor=ef4d23`,
    isVerified: Boolean(prof.is_verified),
    joinedDate: prof.created_at ? new Date(prof.created_at as string).toLocaleDateString('en-BD', { year: 'numeric', month: 'long' }) : '',
    rating: parseFloat((prof.rating as number)?.toString() || '0') || 0,
    totalSales: (prof.total_sales as number) || 0,
    totalPurchases: (prof.total_purchases as number) || 0,
    phone: prof.phone as string | undefined,
    rollNumber: prof.student_roll as string | undefined,
    isAdmin: Boolean(prof.is_admin),
    registrationNo: prof.student_reg_no as string | undefined,
  };
}

function mapDbBookToListing(row: Record<string, unknown>, sellerProfile: Record<string, unknown> | null, images: string[]): BookListing {
  const seller = mapDbProfileToStudentUser(sellerProfile, row.seller_id as string);

  return {
    id: row.id as string,
    title: row.title as string,
    author: row.author as string,
    edition: row.edition as string | undefined,
    subjectCode: row.subject_code as string,
    subjectName: row.subject_name as string,
    department: row.department as string,
    semester: row.semester as string,
    condition: row.condition as BookListing['condition'],
    conditionDetails: row.condition_details as string,
    originalPrice: row.original_price as number,
    sellingPrice: row.selling_price as number,
    savings: Math.max(0, (row.original_price as number) - (row.selling_price as number)),
    images: images.length > 0 ? images : ['https://placehold.co/600x400/f3f4f6/9ca3af?text=No+Image'],
    availability: row.availability as BookListing['availability'],
    seller,
    pickupPointId: row.pickup_point_id as string,
    pickupPointName: row.pickup_point_name as string,
    createdAt: new Date(row.created_at as string).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }),
    createdAtRaw: row.created_at as string,
    viewsCount: (row.views_count as number) || 0,
    isbn: row.isbn as string | undefined,
    isAdminListing: Boolean(row.is_admin_listing || seller.isAdmin),
  };
}

/**
 * Calculates marketplace hierarchy rank:
 * - Rank 0: Admin VIP Verified listing (Top priority, luxury styling)
 * - Rank 1: Verified Student Seller (Emerald badges)
 * - Rank 2: Non-verified Student listing (Neutral styling)
 */
export function getBookListingRank(book: BookListing): number {
  if (book.isAdminListing || book.seller?.isAdmin) return 0;
  if (book.seller?.isVerified || book.seller?.verificationStatus === 'approved') return 1;
  return 2;
}

function mapDbOrderToOrder(row: Record<string, unknown>, book: BookListing, buyer: StudentUser, seller: StudentUser, pickup: PickupPoint): Order {
  const status = row.status as OrderStatus;
  const statuses: OrderStatus[] = ['placed', 'confirmed', 'dropped_off', 'ready_for_pickup', 'picked_up', 'completed'];
  const currentIdx = statuses.indexOf(status);

  const statusLabels: Partial<Record<OrderStatus, { label: string; note: string }>> = {
    placed: { label: 'Order Placed', note: `PIN: ${row.verification_pin}. Pickup: ${pickup.name}` },
    confirmed: { label: 'Payment Confirmed', note: `৳${row.price} secured in escrow` },
    dropped_off: { label: 'Seller Drop-off', note: `Book delivered to ${pickup.name}` },
    ready_for_pickup: { label: 'Ready for Pickup', note: `Book at ${pickup.locationDetail}` },
    picked_up: { label: 'Book Picked Up', note: 'PIN verified, physical handover done' },
    completed: { label: 'Transaction Completed', note: 'Funds disbursed to seller' },
    cancelled: { label: 'Cancelled', note: (row.cancel_reason as string) || 'Order cancelled' },
    disputed: { label: 'Disputed', note: 'Under review' },
  };
  const labels = statusLabels;

  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    book,
    buyer,
    seller,
    price: row.price as number,
    status,
    pickupPoint: pickup,
    paymentState: row.payment_state as Order['paymentState'],
    verificationPin: row.verification_pin as string,
    cancelReason: (row.cancel_reason as string) || undefined,
    createdAt: new Date(row.created_at as string).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }),
    createdAtRaw: row.created_at as string,
    updatedAt: new Date(row.updated_at as string).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }),
    timeline: statuses.map((s, i) => ({
      status: s,
      timestamp: i <= currentIdx ? 'Done' : 'Pending',
      label: labels[s]?.label || s,
      note: labels[s]?.note || '',
      isCompleted: i < currentIdx,
      isCurrent: i === currentIdx,
    })),
  };
}

function mapDbBookRequest(row: Record<string, unknown>): BookRequest {
  const prof = (row.profile ?? {}) as Record<string, unknown>;
  const createdAt = row.created_at as string;
  return {
    id: row.id as string,
    requesterId: row.requester_id as string,
    requesterName: (prof.full_name as string) || 'Student',
    requesterAvatar: (prof.avatar_url as string) ||
      `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent((prof.full_name as string) || 'Student')}&backgroundColor=ef4d23`,
    requesterDepartment: (prof.department as string) || '',
    title: row.title as string,
    subjectCode: row.subject_code as string,
    department: row.department as string,
    semester: row.semester as string,
    maxBudget: row.max_budget != null ? Number(row.max_budget) : undefined,
    description: (row.description as string) || '',
    status: (row.status as 'open' | 'fulfilled' | 'cancelled') || 'open',
    fulfilledByBookId: (row.fulfilled_by_book_id as string) || undefined,
    createdAt: createdAt ? new Date(createdAt).toLocaleDateString('en-BD', { month: 'short', day: 'numeric' }) : '',
    createdAtRaw: createdAt ? new Date(createdAt).getTime() : 0,
  };
}

// ─── Context types ───────────────────────────────────────────────────────────

interface MarketplaceContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedBookId: string | null;
  setSelectedBookId: (id: string | null) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  navigateToBook: (bookId: string) => void;
  navigateToOrder: (orderId: string) => void;

  currentUser: StudentUser;
  setCurrentUser: React.Dispatch<React.SetStateAction<StudentUser>>;
  books: BookListing[];
  pickupPoints: PickupPoint[];
  wishlistIds: string[];
  orders: Order[];
  notifications: NotificationItem[];
  disputes: DisputeReport[];

  dataLoading: boolean;
  refreshBooks: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshNotifications: () => Promise<void>;

  toggleWishlist: (bookId: string) => Promise<void>;
  isWishlisted: (bookId: string) => boolean;
  addBookListing: (newBook: Omit<BookListing, 'id' | 'seller' | 'createdAt' | 'viewsCount' | 'savings'>, imageFiles?: File[]) => Promise<string>;
  updateBookStatus: (bookId: string, availability: BookListing['availability']) => Promise<void>;
  deleteBookListing: (bookId: string) => Promise<void>;
  createOrder: (bookId: string, pickupPointId: string) => Promise<{ orderId: string; error: string | null }>;
  verifyPickupPin: (orderId: string, pin: string) => Promise<{ success: boolean; message: string }>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  fileDispute: (orderNumber: string, bookTitle: string, reason: string, details: string) => Promise<void>;
  resolveDispute: (disputeId: string, status: DisputeReport['status']) => Promise<void>;

  // ── Reviews (completed transactions only) ────────────────────────────────
  /** Reviews the signed-in user has RECEIVED (shown on their profile) */
  reviews: Review[];
  /** Reviews the signed-in user has WRITTEN (used to lock the review form) */
  reviewsGiven: Review[];
  refreshReviews: () => Promise<void>;
  submitReview: (orderId: string, rating: number, comment: string) => Promise<{ success: boolean; message: string }>;
  hasReviewedOrder: (orderId: string) => boolean;

  // ── Student ID verification (admin approved) ────────────────────────────
  verificationRequest: VerificationRequest | null;
  verificationQueue: VerificationRequest[];
  refreshVerification: () => Promise<void>;
  submitVerificationRequest: (data: {
    studentRoll: string;
    studentRegNo: string;
    idCardFile: File | null;
  }) => Promise<{ success: boolean; message: string }>;
  decideVerification: (requestId: string, decision: 'approved' | 'rejected', note?: string) => Promise<void>;

  // ── Order cancellation ────────────────────────────────────────────────
  cancelOrder: (orderId: string, reason: string) => Promise<{ success: boolean; message: string }>;

  // ── Book requests ────────────────────────────────────────────────────────
  bookRequests: BookRequest[];
  loadingRequests: boolean;
  prefillSellData: Partial<BookListing> | null;
  setPrefillSellData: (data: Partial<BookListing> | null) => void;
  refreshBookRequests: () => Promise<void>;
  createBookRequest: (data: {
    title: string;
    subjectCode: string;
    department: string;
    semester: string;
    maxBudget?: number;
    description?: string;
  }) => Promise<{ success: boolean; message: string; id?: string }>;
  cancelBookRequest: (requestId: string) => Promise<{ success: boolean; message: string }>;
  fulfillBookRequest: (requestId: string, bookId?: string) => Promise<{ success: boolean; message: string }>;
  startSellForRequest: (request: BookRequest) => void;

  /** True when the signed-in profile has the is_admin flag */
  isAdmin: boolean;

  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  applyQuickSubjectSearch: (codeOrName: string) => void;

  filteredBooks: BookListing[];
  unreadNotificationCount: number;

  user: User | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  authModalMessage?: string;
  openAuthModal: (tab?: 'login' | 'register', message?: string) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
}

const defaultFilters: FilterState = {
  search: '', department: 'All Departments', semester: 'All Semesters',
  subjectCode: '', condition: 'All Conditions', availability: 'All',
  minPrice: 0, maxPrice: 2000, sortBy: 'recommended',
};

/** Maps a DB review row (with joined reviewer + book) to the app's Review shape */
function mapDbReviewToReview(row: Record<string, unknown>): Review {
  const reviewer = (row.reviewer ?? {}) as Record<string, unknown>;
  const book = (row.book ?? {}) as Record<string, unknown>;
  const department = [reviewer.department, reviewer.semester].filter(Boolean).join(' • ');

  return {
    id: row.id as string,
    reviewerName: (reviewer.full_name as string) || 'Illdoor Student',
    reviewerDepartment: department || 'Polytechnic Student',
    rating: row.rating as number,
    comment: (row.comment as string) || '',
    date: new Date(row.created_at as string).toLocaleDateString('en-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    bookTitle: (book.title as string) || 'Campus textbook',
    orderId: row.order_id as string,
    reviewerId: row.reviewer_id as string,
    revieweeId: row.reviewee_id as string,
    bookId: row.book_id as string,
    // The DB trigger only accepts reviews attached to a completed order
    isVerifiedTransaction: true,
  };
}

/** Maps a DB verification request row to the app's VerificationRequest shape */
function mapDbVerificationRequest(row: Record<string, unknown>): VerificationRequest {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    studentRoll: row.student_roll as string,
    studentRegNo: (row.student_reg_no as string) || '',
    idCardPath: (row.id_card_path as string) ?? null,
    status: row.status as VerificationRequest['status'],
    adminNote: (row.admin_note as string) || '',
    createdAt: new Date(row.created_at as string).toLocaleDateString('en-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    reviewedAt: (row.reviewed_at as string) ?? undefined,
  };
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const isAuthenticated = Boolean(user && user.id);
  /** Admin flag comes from the DB — the client can only read it */
  const isAdmin = Boolean(profile?.isAdmin);

  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Auth modal management for guests
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>();

  const openAuthModal = useCallback((tab: 'login' | 'register' = 'login', message?: string) => {
    setAuthModalTab(tab);
    setAuthModalMessage(message);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthModalMessage(undefined);
  }, []);

  // Close auth modal on successful login
  useEffect(() => {
    if (user) {
      setIsAuthModalOpen(false);
    }
  }, [user]);

  const [currentUser, setCurrentUser] = useState<StudentUser>(() =>
    profile ?? {
      id: '', name: '', email: '', studentId: '', institute: '',
      department: '', semester: '', avatar: '', isVerified: false,
      joinedDate: '', rating: 0, totalSales: 0, totalPurchases: 0,
    }
  );

  const [books, setBooks] = useState<BookListing[]>(INITIAL_BOOKS);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>(FALLBACK_PICKUP_POINTS);
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('local_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [disputes, setDisputes] = useState<DisputeReport[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsGiven, setReviewsGiven] = useState<Review[]>([]);
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [verificationQueue, setVerificationQueue] = useState<VerificationRequest[]>([]);
  const [bookRequests, setBookRequests] = useState<BookRequest[]>(INITIAL_BOOK_REQUESTS);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [prefillSellData, setPrefillSellData] = useState<Partial<BookListing> | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync currentUser from auth profile
  useEffect(() => {
    if (profile) setCurrentUser(profile);
  }, [profile]);

  // ── Fetch pickup points ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('pickup_points').select('*').then(({ data }) => {
      if (data && data.length > 0) {
        setPickupPoints(data.map((p) => ({
          id: p.id, name: p.name, campus: p.campus,
          locationDetail: p.location_detail, operatingHours: p.operating_hours,
          contactPerson: p.contact_person, phone: p.phone,
        })));
      }
    });
  }, []);

  // ── Fetch books ──────────────────────────────────────────────────────────
  const refreshBooks = useCallback(async () => {
    const { data: booksData, error } = await supabase
      .from('books')
      .select('*, profiles(id, full_name, avatar_url, is_verified, is_admin, rating, student_roll, institute, department, semester), book_images(url)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch books from Supabase:', error.message);
      setBooks((prev) => (prev.length > 0 ? prev : INITIAL_BOOKS));
      return;
    }

    if (!booksData || booksData.length === 0) {
      setBooks(INITIAL_BOOKS);
      return;
    }

    const mapped = booksData.map((row) => {
      const images = ((row.book_images as Array<{ url: string }>) || []).map((img) => img.url);
      return mapDbBookToListing(row as unknown as Record<string, unknown>, row.profiles as Record<string, unknown> | null, images);
    });

    // Ensure Admin VIP listing is preserved at top rank if not yet in database
    const hasAdminVIP = mapped.some((b) => b.isAdminListing || b.seller?.isAdmin);
    if (!hasAdminVIP) {
      const vipSample = INITIAL_BOOKS.find((b) => b.isAdminListing);
      if (vipSample) {
        setBooks([vipSample, ...mapped]);
        return;
      }
    }

    setBooks(mapped);
  }, []);

  // ── Fetch orders ─────────────────────────────────────────────────────────
  const refreshOrders = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        books ( *, book_images(url), profiles(*) ),
        buyer:profiles!buyer_id(*),
        seller:profiles!seller_id(*),
        pickup_points(*)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback query if multi-FK relation aliases differ
      const { data: fallbackData } = await supabase
        .from('orders')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (!fallbackData) return;

      const ordersWithDetails: Order[] = [];
      for (const row of fallbackData) {
        const book = books.find((b) => b.id === row.book_id);
        if (!book) continue;
        const pickup = pickupPoints.find((p) => p.id === row.pickup_point_id) ?? pickupPoints[0] ?? FALLBACK_PICKUP_POINTS[0];
        const isBuyer = row.buyer_id === user.id;
        const buyerUser: StudentUser = isBuyer ? currentUser : book.seller;
        const sellerUser: StudentUser = isBuyer ? book.seller : currentUser;
        ordersWithDetails.push(
          mapDbOrderToOrder(row as unknown as Record<string, unknown>, book, buyerUser, sellerUser, pickup)
        );
      }
      setOrders(ordersWithDetails);
      return;
    }

    if (!data) return;

    const ordersWithDetails: Order[] = [];
    for (const row of data) {
      const rowRecord = row as Record<string, unknown>;
      const bookRow = rowRecord.books as Record<string, unknown> | null;
      let book: BookListing | undefined;
      if (bookRow) {
        const bookImages = ((bookRow.book_images as Array<{ url: string }>) || []).map((img) => img.url);
        book = mapDbBookToListing(bookRow, bookRow.profiles as Record<string, unknown> | null, bookImages);
      } else {
        book = books.find((b) => b.id === row.book_id);
      }
      if (!book) continue;

      const pickupRow = rowRecord.pickup_points as Record<string, unknown> | null;
      const pickup: PickupPoint = pickupRow ? {
        id: pickupRow.id as string,
        name: pickupRow.name as string,
        campus: pickupRow.campus as string,
        locationDetail: pickupRow.location_detail as string,
        operatingHours: pickupRow.operating_hours as string,
        contactPerson: pickupRow.contact_person as string,
        phone: pickupRow.phone as string,
      } : (pickupPoints.find((p) => p.id === row.pickup_point_id) ?? pickupPoints[0] ?? FALLBACK_PICKUP_POINTS[0]);

      const buyerUser = mapDbProfileToStudentUser(rowRecord.buyer as Record<string, unknown> | null, row.buyer_id);
      const sellerUser = mapDbProfileToStudentUser(rowRecord.seller as Record<string, unknown> | null, row.seller_id);

      ordersWithDetails.push(
        mapDbOrderToOrder(rowRecord, book, buyerUser, sellerUser, pickup)
      );
    }
    setOrders(ordersWithDetails);
  }, [user, books, pickupPoints, currentUser]);

  // ── Fetch notifications ──────────────────────────────────────────────────
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!data) return;
    setNotifications(data.map((n) => ({
      id: n.id, title: n.title, message: n.message,
      type: n.type as NotificationItem['type'], read: n.read,
      timestamp: new Date(n.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }),
      linkRoute: n.link_route as ActiveView | undefined, linkId: n.link_id ?? undefined,
    })));
  }, [user]);

  // ── Fetch wishlist ───────────────────────────────────────────────────────
  const refreshWishlist = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('wishlist').select('book_id').eq('user_id', user.id);
    if (data) {
      const dbIds = data.map((w) => w.book_id);
      let localIds: string[] = [];
      try {
        const saved = localStorage.getItem('local_wishlist');
        if (saved) localIds = JSON.parse(saved);
      } catch {
        localIds = [];
      }
      const combined = Array.from(new Set([...dbIds, ...localIds]));
      setWishlistIds(combined);
      try {
        localStorage.removeItem('local_wishlist');
      } catch {
        // ignore
      }
    }
  }, [user]);

  // ── Fetch disputes (admins see every dispute on campus) ──────────────────
  const refreshDisputes = useCallback(async () => {
    if (!user) return;
    let query = supabase.from('disputes').select('*').order('created_at', { ascending: false });
    if (!isAdmin) {
      query = query.eq('reported_by', user.id);
    }
    const { data } = await query;
    if (!data) return;
    setDisputes(data.map((d) => ({
      id: d.id, orderNumber: d.order_number, bookTitle: d.book_title,
      reportedBy: currentUser.name, reason: d.reason, details: d.details,
      status: d.status as DisputeReport['status'],
      date: new Date(d.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }),
      priority: d.priority as DisputeReport['priority'],
    })));
  }, [user, currentUser.name, isAdmin]);

  // ── Fetch reviews (received + written by the signed-in student) ──────────
  const refreshReviews = useCallback(async () => {
    if (!user) {
      setReviews([]);
      setReviewsGiven([]);
      return;
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, department, semester), book:books(title)')
      .or(`reviewee_id.eq.${user.id},reviewer_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Review fetch failed:', error?.message);
      return;
    }

    const mapped = data.map((row) => mapDbReviewToReview(row as unknown as Record<string, unknown>));
    setReviews(mapped.filter((r) => r.revieweeId === user.id));
    setReviewsGiven(mapped.filter((r) => r.reviewerId === user.id));
  }, [user]);

  // ── Fetch student ID verification (own request + admin queue) ────────────
  const refreshVerification = useCallback(async () => {
    if (!user) {
      setVerificationRequest(null);
      setVerificationQueue([]);
      return;
    }

    const { data: mine } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const mapped = mine ? mapDbVerificationRequest(mine as unknown as Record<string, unknown>) : null;
    setVerificationRequest(mapped);
    setCurrentUser((prev) => ({ ...prev, verificationStatus: mapped?.status }));

    if (!isAdmin) {
      setVerificationQueue([]);
      return;
    }

    const { data: queue } = await supabase
      .from('verification_requests')
      .select('*, profile:profiles!verification_requests_user_id_fkey(full_name, institute, department, semester)')
      .order('created_at', { ascending: true });

    setVerificationQueue((queue ?? []).map((row) => {
      const record = row as unknown as Record<string, unknown>;
      const prof = (record.profile ?? {}) as Record<string, unknown>;
      return {
        ...mapDbVerificationRequest(record),
        userName: (prof.full_name as string) || 'Student',
        userInstitute: prof.institute as string,
        userDepartment: prof.department as string,
        userSemester: prof.semester as string,
      };
    }));
  }, [user, isAdmin]);

  // ── Fetch book requests ──────────────────────────────────────────────────
  const refreshBookRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('book_requests')
        .select('*, profile:profiles!book_requests_requester_id_fkey(full_name, avatar_url, department)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch book requests:', error.message);
        return;
      }

      if (data && data.length > 0) {
        setBookRequests(data.map((row) => mapDbBookRequest(row as unknown as Record<string, unknown>)));
      } else {
        setBookRequests((prev) => (prev.length > 0 ? prev : INITIAL_BOOK_REQUESTS));
      }
    } catch (err) {
      console.warn('Error fetching book requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setDataLoading(true);
      await Promise.all([refreshBooks(), refreshBookRequests()]);
      setDataLoading(false);
    };
    loadAll();
  }, [refreshBooks, refreshBookRequests]);

  useEffect(() => {
    if (user && books.length >= 0) {
      refreshOrders();
      refreshWishlist();
      refreshNotifications();
      refreshDisputes();
      refreshReviews();
      refreshVerification();
    }
  }, [
    user, books.length, refreshOrders, refreshWishlist, refreshNotifications,
    refreshDisputes, refreshReviews, refreshVerification,
  ]);

  // ─ Realtime sync (live listings, orders & notifications) ────────────────
  // Keeps the latest refresh callbacks in a ref so the websocket channels are
  // created once (per user) instead of being torn down on every state change.
  const refreshFnsRef = useRef({
    refreshBooks,
    refreshOrders,
    refreshNotifications,
    refreshReviews,
    refreshVerification,
    refreshProfile,
    refreshBookRequests,
  });

  useEffect(() => {
    refreshFnsRef.current = {
      refreshBooks,
      refreshOrders,
      refreshNotifications,
      refreshReviews,
      refreshVerification,
      refreshProfile,
      refreshBookRequests,
    };
  }, [
    refreshBooks, refreshOrders, refreshNotifications,
    refreshReviews, refreshVerification, refreshProfile,
    refreshBookRequests,
  ]);

  // Coalesces bursts of change events into a single refetch
  const realtimeTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const scheduleRealtimeRefresh = useCallback((key: string, run: () => void) => {
    const pending = realtimeTimersRef.current[key];
    if (pending) clearTimeout(pending);
    realtimeTimersRef.current[key] = setTimeout(run, 350);
  }, []);

  // Public marketplace listings: every student sees new/updated books instantly
  useEffect(() => {
    const channel = supabase
      .channel('illdoor-books-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => {
        scheduleRealtimeRefresh('books', () => { void refreshFnsRef.current.refreshBooks(); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_images' }, () => {
        scheduleRealtimeRefresh('books', () => { void refreshFnsRef.current.refreshBooks(); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_requests' }, () => {
        scheduleRealtimeRefresh('requests', () => { void refreshFnsRef.current.refreshBookRequests(); });
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [scheduleRealtimeRefresh]);

  // Private streams: this user's orders and notifications (RLS keeps payloads scoped)
  const realtimeUserId = user?.id ?? null;

  useEffect(() => {
    if (!realtimeUserId) return;

    const channel = supabase
      .channel(`illdoor-user-${realtimeUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `buyer_id=eq.${realtimeUserId}` },
        () => { scheduleRealtimeRefresh('orders', () => { void refreshFnsRef.current.refreshOrders(); }); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `seller_id=eq.${realtimeUserId}` },
        () => { scheduleRealtimeRefresh('orders', () => { void refreshFnsRef.current.refreshOrders(); }); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${realtimeUserId}` },
        () => {
          scheduleRealtimeRefresh('notifications', () => {
            void refreshFnsRef.current.refreshNotifications();
            void refreshFnsRef.current.refreshProfile();
          });
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [realtimeUserId, scheduleRealtimeRefresh]);

  // Trust signals: reviews about/from this student, plus their verification status
  useEffect(() => {
    if (!realtimeUserId) return;

    const channel = supabase
      .channel(`illdoor-trust-${realtimeUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews', filter: `reviewee_id=eq.${realtimeUserId}` },
        () => {
          scheduleRealtimeRefresh('reviews', () => {
            void refreshFnsRef.current.refreshReviews();
            void refreshFnsRef.current.refreshProfile();
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews', filter: `reviewer_id=eq.${realtimeUserId}` },
        () => { scheduleRealtimeRefresh('reviews', () => { void refreshFnsRef.current.refreshReviews(); }); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'verification_requests', filter: `user_id=eq.${realtimeUserId}` },
        () => {
          scheduleRealtimeRefresh('verification', () => {
            void refreshFnsRef.current.refreshVerification();
            void refreshFnsRef.current.refreshProfile();
          });
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [realtimeUserId, scheduleRealtimeRefresh]);

  // Campus desk queue: admins follow every verification request
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('illdoor-admin-verification')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'verification_requests' },
        () => { scheduleRealtimeRefresh('admin-verification', () => { void refreshFnsRef.current.refreshVerification(); }); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [isAdmin, scheduleRealtimeRefresh]);

  // Drop pending timers when the provider unmounts
  useEffect(() => () => {
    Object.values(realtimeTimersRef.current).forEach((timer) => clearTimeout(timer));
    realtimeTimersRef.current = {};
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const addNotification = useCallback(async (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    if (!user) return;
    await supabase.from('notifications').insert({
      user_id: user.id, title: notif.title, message: notif.message,
      type: notif.type, link_route: notif.linkRoute ?? null, link_id: notif.linkId ?? null,
    });
    await refreshNotifications();
  }, [user, refreshNotifications]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const navigateToBook = useCallback((bookId: string) => {
    setSelectedBookId(bookId);
    setActiveView('book-details');
    window.scrollTo({ top: 0, behavior: 'instant' });
    void supabase.rpc('increment_book_views', { p_book_id: bookId });
  }, []);

  const navigateToOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveView('orders');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // ── Wishlist ─────────────────────────────────────────────────────────────
  const toggleWishlist = useCallback(async (bookId: string) => {
    if (!user) {
      setWishlistIds((prev) => {
        const next = prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId];
        try {
          localStorage.setItem('local_wishlist', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      return;
    }

    if (wishlistIds.includes(bookId)) {
      await supabase.from('wishlist').delete().eq('user_id', user.id).eq('book_id', bookId);
      setWishlistIds((prev) => prev.filter((id) => id !== bookId));
    } else {
      await supabase.from('wishlist').insert({ user_id: user.id, book_id: bookId });
      setWishlistIds((prev) => [...prev, bookId]);
    }
  }, [user, wishlistIds]);

  const isWishlisted = useCallback((bookId: string) => wishlistIds.includes(bookId), [wishlistIds]);

  // ── Book actions ─────────────────────────────────────────────────────────
  const addBookListing = useCallback(async (
    newBookData: Omit<BookListing, 'id' | 'seller' | 'createdAt' | 'viewsCount' | 'savings'>,
    imageFiles?: File[]
  ): Promise<string> => {
    if (!user) return '';

    const pickup = pickupPoints.find((p) => p.id === newBookData.pickupPointId) ?? pickupPoints[0];

    // 1. Insert book
    const { data: inserted, error } = await supabase.from('books').insert({
      seller_id: user.id,
      title: newBookData.title,
      author: newBookData.author,
      edition: newBookData.edition ?? null,
      subject_code: newBookData.subjectCode,
      subject_name: newBookData.subjectName,
      department: newBookData.department,
      semester: newBookData.semester,
      condition: newBookData.condition,
      condition_details: newBookData.conditionDetails,
      original_price: newBookData.originalPrice,
      selling_price: newBookData.sellingPrice,
      availability: 'Available',
      pickup_point_id: pickup.id,
      pickup_point_name: pickup.name,
      isbn: newBookData.isbn ?? null,
    }).select('id').single();

    if (error || !inserted) {
      console.warn('Supabase book insert error, falling back to local state:', error);
      const fallbackBookId = `book-local-${Date.now()}`;
      const localListing: BookListing = {
        id: fallbackBookId,
        title: newBookData.title,
        author: newBookData.author,
        edition: newBookData.edition,
        subjectCode: newBookData.subjectCode,
        subjectName: newBookData.subjectName,
        department: newBookData.department,
        semester: newBookData.semester,
        condition: newBookData.condition,
        conditionDetails: newBookData.conditionDetails,
        originalPrice: newBookData.originalPrice,
        sellingPrice: newBookData.sellingPrice,
        savings: Math.max(0, newBookData.originalPrice - newBookData.sellingPrice),
        images: newBookData.images && newBookData.images.length > 0 ? newBookData.images : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'],
        availability: 'Available',
        seller: currentUser,
        pickupPointId: pickup.id,
        pickupPointName: pickup.name,
        createdAt: 'Just now',
        createdAtRaw: new Date().toISOString(),
        viewsCount: 1,
        isAdminListing: Boolean(isAdmin),
      };

      setBooks((prev) => [localListing, ...prev]);
      await addNotification({
        title: 'Book Listed Successfully!',
        message: `Your listing "${newBookData.title}" (Code: ${newBookData.subjectCode}) is now live on Illdoor.`,
        type: 'system',
        linkRoute: 'browse',
      });
      return fallbackBookId;
    }

    const newBookId = inserted.id as string;

    // 2. Upload images if provided, or persist selected preset image
    if (imageFiles && imageFiles.length > 0) {
      const { uploadBookImages } = await import('../lib/imageUpload');
      try {
        const urls = await uploadBookImages(imageFiles, user.id, newBookId);
        if (urls.length > 0) {
          await supabase.from('book_images').insert(urls.map((url) => ({ book_id: newBookId, url })));
        }
      } catch (imgErr) {
        console.warn('Image upload failed:', imgErr);
      }
    } else if (newBookData.images?.[0] && !newBookData.images[0].startsWith('blob:')) {
      await supabase.from('book_images').insert({ book_id: newBookId, url: newBookData.images[0] });
    }

    // 3. Notification
    await addNotification({
      title: 'Book Listed Successfully!',
      message: `Your listing "${newBookData.title}" (Code: ${newBookData.subjectCode}) is now live on Illdoor.`,
      type: 'system',
      linkRoute: 'browse',
    });

    await refreshBooks();
    return newBookId;
  }, [user, pickupPoints, addNotification, refreshBooks]);

  const updateBookStatus = useCallback(async (bookId: string, availability: BookListing['availability']) => {
    await supabase.from('books').update({ availability }).eq('id', bookId);
    setBooks((prev) => prev.map((b) => b.id === bookId ? { ...b, availability } : b));
  }, []);

  const deleteBookListing = useCallback(async (bookId: string) => {
    await supabase.from('books').delete().eq('id', bookId);
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
  }, []);

  // ── Order actions ────────────────────────────────────────────────────────
  const createOrder = useCallback(async (bookId: string, pickupPointId: string): Promise<{ orderId: string; error: string | null }> => {
    if (!user) return { orderId: '', error: 'Please log in first.' };

    const { data, error } = await supabase.rpc('place_order', {
      p_book_id: bookId,
      p_pickup_point_id: pickupPointId,
    });

    if (error) {
      console.error('place_order RPC error:', error);
      return { orderId: '', error: error.message };
    }

    await Promise.all([refreshBooks(), refreshOrders(), refreshNotifications()]);
    return { orderId: data as string, error: null };
  }, [user, refreshBooks, refreshOrders, refreshNotifications]);

  const verifyPickupPin = useCallback(async (orderId: string, pin: string): Promise<{ success: boolean; message: string }> => {
    const { data, error } = await supabase.rpc('verify_pickup_pin', {
      p_order_id: orderId,
      p_pin: pin.trim(),
    });

    if (error) {
      console.error('verify_pickup_pin RPC error:', error);
      return { success: false, message: error.message };
    }

    await Promise.all([refreshOrders(), refreshBooks(), refreshNotifications()]);
    return data as { success: boolean; message: string };
  }, [refreshOrders, refreshBooks, refreshNotifications]);

  // ── Notification actions ─────────────────────────────────────────────────
  const markNotificationAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  // ── Dispute actions ──────────────────────────────────────────────────────
  const fileDispute = useCallback(async (orderNumber: string, bookTitle: string, reason: string, details: string) => {
    if (!user) return;
    const order = orders.find((o) => o.orderNumber === orderNumber);
    await supabase.from('disputes').insert({
      order_id: order?.id ?? null,
      order_number: orderNumber, book_title: bookTitle,
      reported_by: user.id, reason, details,
    });
    await addNotification({
      title: `Dispute Filed — Order #${orderNumber}`,
      message: `Your report has been received. Escrow payout is paused pending review.`,
      type: 'dispute',
      linkRoute: 'orders',
    });
    await refreshDisputes();
  }, [user, orders, addNotification, refreshDisputes]);

  const resolveDispute = useCallback(async (disputeId: string, status: DisputeReport['status']) => {
    setDisputes((prev) => prev.map((d) => d.id === disputeId ? { ...d, status } : d));
    // Persisted so the decision survives a refresh (admin-only via RLS)
    await supabase.from('disputes').update({ status }).eq('id', disputeId);
  }, []);

  // ── Reviews ──────────────────────────────────────────────────────────────
  const submitReview = useCallback(async (
    orderId: string,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'Please log in to leave a review.' };

    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found.' };
    if (order.status !== 'completed') {
      return { success: false, message: 'Reviews unlock once the pickup PIN is verified.' };
    }

    const counterparty = order.buyer.id === user.id ? order.seller : order.buyer;

    const { error } = await supabase.from('reviews').insert({
      order_id: orderId,
      book_id: order.book.id,
      reviewer_id: user.id,
      reviewee_id: counterparty.id,
      rating,
      comment: comment.trim(),
    });

    if (error) {
      console.error('Review insert error:', error);
      const duplicate = error.code === '23505';
      return {
        success: false,
        message: duplicate ? 'You have already reviewed this transaction.' : error.message,
      };
    }

    await addNotification({
      title: 'Review Published',
      message: `Thanks! Your ${rating}-star review of ${counterparty.name} is now part of the campus trust score.`,
      type: 'system',
      linkRoute: 'profile',
    });

    await refreshReviews();
    return { success: true, message: 'Review published. Thank you for keeping Illdoor trusted!' };
  }, [user, orders, addNotification, refreshReviews]);

  const hasReviewedOrder = useCallback(
    (orderId: string) => reviewsGiven.some((r) => r.orderId === orderId),
    [reviewsGiven]
  );

  // ── Student ID verification ──────────────────────────────────────────────
  const submitVerificationRequest = useCallback(async (data: {
    studentRoll: string;
    studentRegNo: string;
    idCardFile: File | null;
  }): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'Please log in first.' };

    let idCardPath: string | null = null;
    if (data.idCardFile) {
      try {
        const { uploadStudentIdCard } = await import('../lib/imageUpload');
        idCardPath = await uploadStudentIdCard(data.idCardFile, user.id);
      } catch (err) {
        console.error('ID card upload failed:', err);
        return { success: false, message: 'ID card upload failed. Please try a smaller photo.' };
      }
    }

    const payload = {
      student_roll: data.studentRoll.trim(),
      student_reg_no: data.studentRegNo.trim(),
      status: 'pending' as const,
      admin_note: '',
      reviewed_by: null,
      reviewed_at: null,
    };

    const { error } = verificationRequest
      ? await supabase
          .from('verification_requests')
          .update({ ...payload, ...(idCardPath ? { id_card_path: idCardPath } : {}) })
          .eq('id', verificationRequest.id)
      : await supabase.from('verification_requests').insert({
          user_id: user.id,
          ...payload,
          id_card_path: idCardPath,
        });

    if (error) {
      console.error('Verification submit error:', error);
      return { success: false, message: error.message };
    }

    await addNotification({
      title: 'Student ID Submitted',
      message: 'Your BTEB roll, registration number and ID card are queued for campus desk review.',
      type: 'verification',
      linkRoute: 'profile',
    });

    await refreshVerification();
    return { success: true, message: 'Submitted! The campus desk will verify your student ID shortly.' };
  }, [user, verificationRequest, addNotification, refreshVerification]);

  const decideVerification = useCallback(async (
    requestId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ) => {
    if (!isAdmin) return;
    await supabase
      .from('verification_requests')
      .update({
        status: decision,
        admin_note: note?.trim() || '',
        reviewed_by: user?.id ?? null,
      })
      .eq('id', requestId);

    await refreshVerification();
  }, [isAdmin, user, refreshVerification]);

  // ── Order cancellation ───────────────────────────────────────────────────
  const cancelOrder = useCallback(async (
    orderId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'Please log in first.' };

    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found.' };

    if (order.buyer.id !== user.id && order.seller.id !== user.id) {
      return { success: false, message: 'You can only cancel your own orders.' };
    }
    if (order.status !== 'placed' && order.status !== 'confirmed') {
      return {
        success: false,
        message: 'This order can no longer be cancelled — the book is already in the pickup flow.',
      };
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancel_reason: reason.trim() || 'Cancelled by student' })
      .eq('id', orderId);

    if (error) {
      console.error('Order cancel error:', error);
      return { success: false, message: error.message };
    }

    // The DB trigger refunds escrow, frees the listing and notifies both sides
    await refreshOrders();
    await refreshBooks();
    return { success: true, message: 'Order cancelled and the escrow amount refunded.' };
  }, [user, orders, refreshOrders, refreshBooks]);

  // ── Book requests handlers ───────────────────────────────────────────────
  const createBookRequest = useCallback(async (data: {
    title: string;
    subjectCode: string;
    department: string;
    semester: string;
    maxBudget?: number;
    description?: string;
  }) => {
    if (!user) {
      openAuthModal('login', 'বইয়ের অনুরোধ করতে দয়া করে লগইন করুন (Please log in to request books)');
      return { success: false, message: 'Not authenticated' };
    }

    const { data: inserted, error } = await supabase
      .from('book_requests')
      .insert({
        requester_id: user.id,
        title: data.title.trim(),
        subject_code: data.subjectCode.trim(),
        department: data.department,
        semester: data.semester,
        max_budget: data.maxBudget || null,
        description: data.description?.trim() || null,
        status: 'open',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    await refreshBookRequests();
    return {
      success: true,
      message: 'Book request posted successfully! You will be notified when someone lists this book.',
      id: inserted?.id,
    };
  }, [user, openAuthModal, refreshBookRequests]);

  const cancelBookRequest = useCallback(async (requestId: string) => {
    if (!user) return { success: false, message: 'Not authenticated' };

    const { error } = await supabase
      .from('book_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) return { success: false, message: error.message };
    await refreshBookRequests();
    return { success: true, message: 'Request cancelled successfully.' };
  }, [user, refreshBookRequests]);

  const fulfillBookRequest = useCallback(async (requestId: string, bookId?: string) => {
    if (!user) return { success: false, message: 'Not authenticated' };

    const { error } = await supabase
      .from('book_requests')
      .update({
        status: 'fulfilled',
        fulfilled_by_book_id: bookId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) return { success: false, message: error.message };
    await refreshBookRequests();
    return { success: true, message: 'Request marked as fulfilled!' };
  }, [user, refreshBookRequests]);

  const startSellForRequest = useCallback((req: BookRequest) => {
    setPrefillSellData({
      title: req.title,
      subjectCode: req.subjectCode,
      department: req.department,
      semester: req.semester,
      sellingPrice: req.maxBudget || undefined,
    });
    setActiveView('sell');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setActiveView]);

  // ── Filters ─────────────────────────────────────────────────────────────
  const resetFilters = () => { setFilters(defaultFilters); setSearchQuery(''); };

  const applyQuickSubjectSearch = (codeOrName: string) => {
    setSearchQuery(codeOrName);
    setFilters((prev) => ({ ...prev, search: codeOrName }));
    setActiveView('browse');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Computed: filtered books ─────────────────────────────────────────────
  const filteredBooks = React.useMemo(() => {
    return books.filter((book) => {
      const query = (filters.search || searchQuery).trim().toLowerCase();
      if (query) {
        const matches = [book.title, book.author, book.subjectName, book.subjectCode, book.department]
          .some((f) => f.toLowerCase().includes(query));
        if (!matches) return false;
      }
      if (filters.department !== 'All Departments' && book.department !== filters.department) return false;
      if (filters.semester !== 'All Semesters' && book.semester !== filters.semester) return false;
      if (filters.condition !== 'All Conditions' && book.condition !== filters.condition) return false;
      if (filters.availability !== 'All' && book.availability !== filters.availability) return false;
      if (book.sellingPrice < filters.minPrice || book.sellingPrice > filters.maxPrice) return false;
      return true;
    }).sort((a, b) => {
      // 1. Strict Tier Hierarchy Sorting:
      // Rank 0 (Admin VIP) -> Rank 1 (Verified Student) -> Rank 2 (Non-verified)
      const rankA = getBookListingRank(a);
      const rankB = getBookListingRank(b);
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // 2. Secondary sorting within the same rank tier
      if (filters.sortBy === 'newest') {
        return Date.parse(b.createdAtRaw || '0') - Date.parse(a.createdAtRaw || '0');
      }
      if (filters.sortBy === 'price_low') return a.sellingPrice - b.sellingPrice;
      if (filters.sortBy === 'price_high') return b.sellingPrice - a.sellingPrice;
      if (a.availability === 'Available' && b.availability !== 'Available') return -1;
      if (b.availability === 'Available' && a.availability !== 'Available') return 1;
      return b.savings - a.savings;
    });
  }, [books, filters, searchQuery]);

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  const contextValue = React.useMemo(() => ({
    activeView, setActiveView,
    selectedBookId, setSelectedBookId,
    selectedOrderId, setSelectedOrderId,
    navigateToBook, navigateToOrder,
    currentUser, setCurrentUser,
    books, pickupPoints, wishlistIds, orders, notifications, disputes,
    reviews, reviewsGiven, verificationRequest, verificationQueue,
    dataLoading,
    refreshBooks, refreshOrders, refreshNotifications, refreshReviews, refreshVerification,
    toggleWishlist, isWishlisted,
    addBookListing, updateBookStatus, deleteBookListing,
    createOrder, verifyPickupPin, cancelOrder,
    submitReview, hasReviewedOrder,
    submitVerificationRequest, decideVerification,
    markNotificationAsRead, markAllNotificationsAsRead,
    fileDispute, resolveDispute,
    filters, setFilters, resetFilters,
    searchQuery, setSearchQuery,
    applyQuickSubjectSearch,
    bookRequests, loadingRequests, prefillSellData, setPrefillSellData,
    refreshBookRequests, createBookRequest, cancelBookRequest, fulfillBookRequest, startSellForRequest,
    filteredBooks, unreadNotificationCount,
    user, isAuthenticated, isAdmin,
    isAuthModalOpen, authModalTab, authModalMessage,
    openAuthModal, closeAuthModal,
    signOut,
  }), [
    activeView, selectedBookId, selectedOrderId, navigateToBook, navigateToOrder,
    currentUser, books, pickupPoints, wishlistIds, orders, notifications, disputes,
    reviews, reviewsGiven, verificationRequest, verificationQueue,
    dataLoading, refreshBooks, refreshOrders, refreshNotifications, refreshReviews, refreshVerification,
    toggleWishlist, isWishlisted, addBookListing, updateBookStatus, deleteBookListing,
    createOrder, verifyPickupPin, cancelOrder, submitReview, hasReviewedOrder,
    submitVerificationRequest, decideVerification, markNotificationAsRead, markAllNotificationsAsRead,
    fileDispute, resolveDispute, filters, searchQuery, applyQuickSubjectSearch,
    bookRequests, loadingRequests, prefillSellData,
    refreshBookRequests, createBookRequest, cancelBookRequest, fulfillBookRequest, startSellForRequest,
    filteredBooks, unreadNotificationCount, user, isAuthenticated, isAdmin,
    isAuthModalOpen, authModalTab, authModalMessage, openAuthModal, closeAuthModal, signOut
  ]);

  return (
    <MarketplaceContext.Provider value={contextValue}>
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = (): MarketplaceContextType => {
  const context = useContext(MarketplaceContext);
  if (!context) throw new Error('useMarketplace must be used within a MarketplaceProvider');
  return context;
};

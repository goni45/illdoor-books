import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  PickupType,
  Review,
  StudentUser,
  SellerListing,
  CurriculumEntry,
  PublicationEdition,
  VerificationRequest,
} from '../types';
import { getPublicationCover } from '../lib/publicationEditions';
import { DEPARTMENTS, SEMESTERS, CONDITIONS, PICKUP_POINTS as FALLBACK_PICKUP_POINTS } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { User } from '@supabase/supabase-js';

export function viewToPath(view: ActiveView): string {
  switch (view) {
    case 'home': return '/';
    case 'browse': return '/books';
    case 'book-details': return '/books';
    case 'semester-bundles': return '/bundles';
    case 'sell': return '/sell';
    case 'orders': return '/orders';
    case 'wishlist': return '/wishlist';
    case 'requests': return '/requests';
    case 'notifications': return '/notifications';
    case 'profile': return '/profile';
    case 'admin': return '/admin';
    default: return '/';
  }
}

export function pathToView(pathname: string): ActiveView {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/books/') && pathname !== '/books') return 'book-details';
  if (pathname.startsWith('/books')) return 'browse';
  if (pathname.startsWith('/bundles')) return 'semester-bundles';
  if (pathname.startsWith('/sell')) return 'sell';
  if (pathname.startsWith('/orders')) return 'orders';
  if (pathname.startsWith('/wishlist')) return 'wishlist';
  if (pathname.startsWith('/requests')) return 'requests';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'home';
}

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
      ('https:' + '//api.dicebear.com/8.x/initials/svg?seed=' + encodeURIComponent((prof.full_name as string) || 'Student') + '&backgroundColor=ef4d23'),
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

function mapDbBookToListing(row: Record<string, unknown>): BookListing {
  const rawOffers = (row.seller_listings ?? []) as Array<Record<string, unknown>>;
  const offers: SellerListing[] = rawOffers.map((offer) => {
    const seller = mapDbProfileToStudentUser(offer.profiles as Record<string, unknown> | null, offer.seller_id as string);
    const rawDetails = (offer.condition_details as string) || '';
    const isSellerPlace = (offer.pickup_type as string) === 'seller_place' ||
      (offer.pickup_point_id as string) === 'seller_place' ||
      rawDetails.includes('[PICKUP_FROM_MY_PLACE]');
    let sellerPlaceAddress = (offer.seller_place_address as string) || '';
    let cleanDetails = rawDetails;
    if (rawDetails.includes('[PICKUP_FROM_MY_PLACE')) {
      const match = rawDetails.match(/\[PICKUP_FROM_MY_PLACE(?::\s*([^\]]*))?\]/);
      if (match) {
        if (!sellerPlaceAddress && match[1]) sellerPlaceAddress = match[1].trim();
        cleanDetails = rawDetails.replace(/\[PICKUP_FROM_MY_PLACE(?::\s*[^\]]*)?\]/, '').trim();
      }
    }
    const pickupPointName = isSellerPlace
      ? (sellerPlaceAddress ? `সেলার স্থান: ${sellerPlaceAddress}` : 'বিক্রেতার স্থান / বাসা থেকে পিকআপ')
      : ((offer.pickup_point_name as string) || 'ক্যাম্পাস পিকআপ পয়েন্ট');

    return {
      id: offer.id as string, bookId: row.id as string, seller,
      condition: offer.condition as SellerListing['condition'],
      conditionDetails: cleanDetails,
      originalPrice: Number(offer.original_price || 0), sellingPrice: Number(offer.selling_price || 0),
      savings: Math.max(0, Number(offer.original_price || 0) - Number(offer.selling_price || 0)),
      availability: offer.availability as SellerListing['availability'],
      publication: (offer.publication as SellerListing['publication']) || 'Haque Publication',
      pickupPointId: isSellerPlace ? 'seller_place' : ((offer.pickup_point_id as string) || ''),
      pickupPointName,
      pickupType: (isSellerPlace ? 'seller_place' : 'campus_spot') as PickupType,
      sellerPlaceAddress,
      createdAt: new Date(offer.created_at as string).toLocaleDateString('en-BD',{day:'numeric',month:'short',year:'numeric'}),
      createdAtRaw: offer.created_at as string,
    };
  }).sort((a,b) => a.sellingPrice-b.sellingPrice);
  const active = offers.filter(o=>o.availability==='Available');
  const curriculumEntries = ((row.curriculum_entries ?? []) as Array<Record<string, unknown>>).map((entry):CurriculumEntry=>({
    id:entry.id as string,
    bookId:(entry.book_id as string)||(row.id as string),
    regulation:(entry.regulation as string)||'2022',
    technologyCode:(entry.technology_code as string)||'',
    department:(entry.department as string)||'',
    semester:(entry.semester as string)||'',
  }));
  const publicationEditions = ((row.book_publication_editions ?? []) as Array<Record<string, unknown>>).map((entry):PublicationEdition=>({
    id: entry.id as string,
    bookId: (entry.book_id as string) || (row.id as string),
    publication: entry.publication as PublicationEdition['publication'],
    authorOverride: (entry.author_override as string) || undefined,
    editionLabel: (entry.edition_label as string) || undefined,
    coverImageUrl: (entry.cover_image_url as string) || undefined,
    sourceUrl: (entry.source_url as string) || undefined,
    sourceProductId: (entry.source_product_id as string) || undefined,
    referencePrice: entry.reference_price == null ? undefined : Number(entry.reference_price),
    lastSyncedAt: (entry.last_synced_at as string) || undefined,
  }));
  const primaryCurriculum=curriculumEntries[0];
  const primary = active[0] ?? offers[0];
  const emptySeller = mapDbProfileToStudentUser(null);
  const fallbackImage = (row.common_image_url as string) || 'https://placehold.co/600x800/f3f4f6/9ca3af?text=Cover+Coming+Soon';
  const selectedPublication = primary?.publication || (row.publication as BookListing['publication']) || 'Haque Publication';
  const editionImage = publicationEditions.find((entry)=>entry.publication===selectedPublication)?.coverImageUrl;
  return {
    id: row.id as string, title: row.title as string, author: row.author as string,
    edition: row.edition as string|undefined, subjectCode: row.subject_code as string,
    subjectName: row.subject_name as string, department:primaryCurriculum?.department||(row.department as string), semester:primaryCurriculum?.semester||(row.semester as string),
    condition: primary?.condition ?? 'Used', conditionDetails: primary?.conditionDetails ?? 'No active seller offers.',
    originalPrice: primary?.originalPrice ?? 0, sellingPrice: primary?.sellingPrice ?? 0,
    savings: primary?.savings ?? 0, images:[editionImage || fallbackImage], commonCoverImageUrl:fallbackImage, availability: active.length?'Available':(primary?.availability ?? 'Inactive'),
    seller: primary?.seller ?? emptySeller,
    pickupPointId: primary?.pickupPointId ?? '',
    pickupPointName: primary?.pickupPointName ?? '',
    pickupType: primary?.pickupType ?? 'campus_spot',
    sellerPlaceAddress: primary?.sellerPlaceAddress ?? '',
    createdAt:new Date(row.created_at as string).toLocaleDateString('en-BD',{day:'numeric',month:'short',year:'numeric'}),
    createdAtRaw:row.created_at as string, viewsCount:Number(row.views_count||0), isbn:row.isbn as string|undefined,
    offers,curriculumEntries,publicationEditions,availableStock:active.length,sellerCount:new Set(active.map(o=>o.seller.id)).size,
    lowestPrice:active[0]?.sellingPrice,status:(row.status as BookListing['status']) ?? 'active',regulation:(row.regulation as string)||'2022',
    publication: selectedPublication,
  };
}

/**
 * Calculates marketplace hierarchy rank:
 * - Rank 0: Admin VIP Verified listing (Top priority, luxury styling)
 * - Rank 1: Verified Student Seller (Emerald badges)
 * - Rank 2: Non-verified Student listing (Neutral styling)
 */
export function getBookListingRank(book:BookListing):number{const active=(book.offers??[]).filter(o=>o.availability==='Available');if(active.some(o=>o.seller.isAdmin))return 0;if(active.some(o=>o.seller.isVerified||o.seller.verificationStatus==='approved'))return 1;return 2}
function applyVisibleOffers(book:BookListing,offers:SellerListing[]):BookListing{
  const sorted=[...offers].sort((a,b)=>a.sellingPrice-b.sellingPrice);
  const active=sorted.filter(o=>o.availability==='Available');
  const primary=active[0]??sorted[0];
  const publication=primary?.publication??book.publication;
  return {
    ...book,
    offers:sorted,
    availableStock:active.length,
    sellerCount:new Set(active.map(o=>o.seller.id)).size,
    lowestPrice:active[0]?.sellingPrice,
    seller:primary?.seller??book.seller,
    condition:primary?.condition??'Used',
    conditionDetails:primary?.conditionDetails??'No active seller offers.',
    originalPrice:primary?.originalPrice??0,
    sellingPrice:primary?.sellingPrice??0,
    savings:primary?.savings??0,
    availability:active.length?'Available':'Inactive',
    publication,
    images:[getPublicationCover(book,publication)],
    pickupPointId:primary?.pickupPointId??'',
    pickupPointName:primary?.pickupPointName??'',
    pickupType:primary?.pickupType??'campus_spot',
    sellerPlaceAddress:primary?.sellerPlaceAddress??'',
  };
}


function mapDbOrderToOrder(row: Record<string, unknown>, book: BookListing, buyer: StudentUser, seller: StudentUser, pickup: PickupPoint): Order {
  const status = row.status as OrderStatus;
  const statuses: OrderStatus[] = ['placed', 'confirmed', 'dropped_off', 'ready_for_pickup', 'picked_up', 'completed'];
  const currentIdx = statuses.indexOf(status);

  const isSellerPlace = book.pickupType === 'seller_place' || (row.pickup_type as string) === 'seller_place' || pickup.id === 'seller_place' || pickup.id === 'seller-place';
  const effectivePickup: PickupPoint = isSellerPlace ? {
    id: 'seller_place',
    name: 'বিক্রেতার স্থান / বাসা থেকে পিকআপ',
    campus: seller.institute || 'সেলার ক্যাম্পাস এলাকা',
    locationDetail: book.sellerPlaceAddress || (row.seller_place_address as string) || 'সেলার নির্ধারিত বাসা বা স্থান থেকে রিসিভ করতে হবে',
    operatingHours: 'সেলার-এর সাথে আলোচনা সাপেক্ষে সরাসরি হ্যান্ডওভার',
    contactPerson: seller.name,
    phone: '',
  } : pickup;

  const statusLabels: Partial<Record<OrderStatus, { label: string; note: string }>> = {
    placed: {
      label: 'অর্ডার সম্পন্ন',
      note: isSellerPlace
        ? `পিকআপ: সেলার-এর স্থান (${book.sellerPlaceAddress || 'সেলার নির্ধারিত স্থান'})`
        : `পিকআপ: ${effectivePickup.name}`
    },
    confirmed: { label: 'পেমেন্ট নিশ্চিত', note: `৳${row.price} এসক্রোতে সুরক্ষিত রাখা হয়েছে` },
    dropped_off: {
      label: isSellerPlace ? 'বিক্রেতা প্রস্তুত' : 'বিক্রেতা ড্রপ-অফ',
      note: isSellerPlace ? `বিক্রেতা তার স্থান থেকে বই হস্তান্তরের জন্য প্রস্তুত` : `বই হস্তান্তর করা হয়েছে: ${effectivePickup.name}`
    },
    ready_for_pickup: {
      label: 'পিকআপের জন্য প্রস্তুত',
      note: isSellerPlace ? `সেলার-এর স্থান: ${effectivePickup.locationDetail}` : `পিকআপ বুথ: ${effectivePickup.locationDetail}`
    },
    picked_up: {
      label: 'বই সংগ্রহ সম্পন্ন',
      note: isSellerPlace ? 'সরাসরি সেলার-এর স্থান থেকে পিন ভেরিফাই করে বই রিসিভ করা হয়েছে' : 'পিন যাচাই করে বুথ থেকে বই বুঝে নেওয়া হয়েছে'
    },
    completed: { label: 'লেনদেন সমাপ্ত', note: 'অর্থ বিক্রেতার অ্যাকাউন্টে ছাড় করা হয়েছে' },
    cancelled: { label: 'বাতিলকৃত', note: (row.cancel_reason as string) || 'অর্ডার বাতিল হয়েছে' },
    disputed: { label: 'বিরোধ তদন্তাধীন', note: 'অ্যাডমিন পর্যালোচনাধীন' },
  };
  const labels = statusLabels;

  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    sellerListingId: (row.seller_listing_id as string) || undefined,
    semesterBundleId: (row.semester_bundle_id as string) || undefined,
    orderType: row.semester_bundle_id ? 'semester_bundle' : 'single',
    book,
    buyer,
    seller,
    price: row.price as number,
    status,
    pickupPoint: effectivePickup,
    pickupType: (isSellerPlace ? 'seller_place' : 'campus_spot') as PickupType,
    sellerPlaceAddress: book.sellerPlaceAddress || (row.seller_place_address as string) || undefined,
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
      ('https:' + '//api.dicebear.com/8.x/initials/svg?seed=' + encodeURIComponent((prof.full_name as string) || 'Student') + '&backgroundColor=ef4d23'),
    requesterDepartment: (prof.department as string) || '',
    title: row.title as string,
    subjectCode: row.subject_code as string,
    department: row.department as string,
    semester: row.semester as string,
    maxBudget: row.max_budget != null ? Number(row.max_budget) : undefined,
    description: (row.description as string) || '',
    status: (row.status as 'open' | 'fulfilled' | 'cancelled') || 'open',
    fulfilledByListingId: (row.fulfilled_by_listing_id as string) || undefined,
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
  const listing = (row.listing ?? {}) as Record<string, unknown>;
  const book = (listing.books ?? {}) as Record<string, unknown>;
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
    bookId: row.seller_listing_id as string,
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

  const navigate = useNavigate();
  const location = useLocation();

  const activeView = useMemo(() => pathToView(location.pathname), [location.pathname]);
  const setActiveView = useCallback((view: ActiveView) => {
    navigate(viewToPath(view));
  }, [navigate]);

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

  const [books, setBooks] = useState<BookListing[]>([]);
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
  const [bookRequests, setBookRequests] = useState<BookRequest[]>([]);
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
    const { data, error } = await supabase.from('books').select(`
      *, curriculum_entries(*), book_publication_editions(*), seller_listings(*, profiles(id,full_name,avatar_url,is_verified,is_admin,rating,total_sales,total_purchases,institute,department,semester,created_at))
    `).order('created_at',{ascending:false});
    if (error || !data) { console.warn('Failed to fetch book models:', error?.message); setBooks([]); return; }
    const institute = isAdmin ? '' : profile?.institute?.trim().toLowerCase();
    const department = isAdmin ? '' : profile?.department?.trim().toLowerCase();
    const mapped = data
      .map((row) => mapDbBookToListing(row as unknown as Record<string, unknown>))
      .filter((book) => !department || (book.curriculumEntries ?? []).some(
        (entry) => entry.department.trim().toLowerCase() === department,
      ) || book.department.trim().toLowerCase() === department)
      .map((book) => applyVisibleOffers(
        book,
        institute
          ? (book.offers ?? []).filter((offer) => offer.seller.institute.trim().toLowerCase() === institute)
          : (book.offers ?? []),
      ));
    setBooks(mapped);
  }, [profile?.institute,isAdmin]);

  // ── Fetch orders ─────────────────────────────────────────────────────────
  const refreshOrders = useCallback(async () => {
    if (!user) return;
    let q=supabase.from('orders').select(`*, seller_listings(*, books(*, book_publication_editions(*)), profiles(id,full_name,avatar_url,is_verified,is_admin,rating,total_sales,total_purchases,institute,department,semester,created_at)), semester_bundles(*, semester_bundle_items(*, books(*, book_publication_editions(*)))), buyer:profiles!buyer_id(id,full_name,avatar_url,is_verified,is_admin,rating,total_sales,total_purchases,institute,department,semester,created_at), seller:profiles!seller_id(id,full_name,avatar_url,is_verified,is_admin,rating,total_sales,total_purchases,institute,department,semester,created_at), pickup_points(*)`);
    if(!isAdmin) q=q.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    const {data,error}=await q.order('created_at',{ascending:false});
    if(error||!data){console.warn('Order fetch failed:',error?.message);return;}
    const mapped:Order[]=data.map((raw:any)=>{
      const l=raw.seller_listings||{}; const bundle=raw.semester_bundles||{}; const model=l.books||{};
      const seller=mapDbProfileToStudentUser(raw.seller,raw.seller_id);
      const offer={...l,profiles:raw.seller};
      const firstBundleBook=bundle.semester_bundle_items?.[0]?.books;
      const book=raw.semester_bundle_id
        ? mapDbBookToListing({
            ...(firstBundleBook || {}),
            id:`bundle-${bundle.id}`,
            title:`${bundle.semester} Complete Book Set`,
            subject_code:'FULL SET',
            subject_name:`${bundle.department} ${bundle.semester}`,
            department:bundle.department,
            semester:bundle.semester,
            seller_listings:[],
            created_at:bundle.created_at,
          })
        : mapDbBookToListing({...model,seller_listings:[offer]});
      const pickupRow=raw.pickup_points||{};
      const pickup:PickupPoint={id:pickupRow.id||raw.pickup_point_id,name:pickupRow.name||'Campus Desk',campus:pickupRow.campus||'',locationDetail:pickupRow.location_detail||'',operatingHours:pickupRow.operating_hours||'',contactPerson:pickupRow.contact_person||'',phone:pickupRow.phone||''};
      return mapDbOrderToOrder(raw,book,mapDbProfileToStudentUser(raw.buyer,raw.buyer_id),seller,pickup);
    }); setOrders(mapped);
  },[user,isAdmin]);

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

  // ── Fetch wishlist ──────────────────────────────────────────────────────
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

      if (localIds.length > 0) {
        const { error: mergeError } = await supabase
          .from('wishlist')
          .upsert(
            localIds.map((bookId) => ({ user_id: user.id, book_id: bookId })),
            { onConflict: 'user_id,book_id', ignoreDuplicates: true }
          );
        if (!mergeError) {
          try {
            localStorage.removeItem('local_wishlist');
          } catch {
            // ignore
          }
        } else {
          console.warn('Could not persist guest wishlist:', mergeError.message);
        }
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
      reportedBy: d.reported_by === user.id ? currentUser.name : (d.reported_by as string), reason: d.reason, details: d.details,
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
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, department, semester), listing:seller_listings(books(title))')
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
        .select('*, profile:profiles!book_requests_requester_id_fkey(full_name, avatar_url, department, institute)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch book requests:', error.message);
        setBookRequests([]);
        return;
      }

      const institute = profile?.institute?.trim();
      const visibleRows = institute
        ? (data || []).filter((row) => (row.profile as { institute?: string } | null)?.institute === institute)
        : (data || []);
      setBookRequests(visibleRows.map((row) => mapDbBookRequest(row as unknown as Record<string, unknown>)));
    } catch (err) {
      console.warn('Error fetching book requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, [profile?.institute]);

  // ── Initial load ────────────────────────────────────────────────────────
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_listings' }, () => {
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
    navigate(`/books/${encodeURIComponent(bookId)}`);
    void supabase.rpc('increment_book_views', { p_book_id: bookId });
  }, [navigate]);

  const navigateToOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    navigate(`/orders/${encodeURIComponent(orderId)}`);
  }, [navigate]);

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
  const addBookListing = useCallback(async (newBookData: Omit<BookListing,'id'|'seller'|'createdAt'|'viewsCount'|'savings'>):Promise<string>=>{
    if(!user) return '';
    const modelId=(newBookData as any).bookModelId as string;
    if(!modelId) throw new Error('Select an existing book model first.');
    const pickup=pickupPoints.find(p=>p.id===newBookData.pickupPointId)??pickupPoints[0];
    const {data,error}=await supabase.rpc('create_seller_listing',{p_book_id:modelId,p_condition:newBookData.condition,p_condition_details:newBookData.conditionDetails,p_original_price:newBookData.originalPrice,p_selling_price:newBookData.sellingPrice,p_pickup_point_id:pickup.id,p_publication:newBookData.publication});
    if(error) throw new Error(error.message);
    await addNotification({title:'Listing published',message:`Your offer for ${newBookData.title} is live.`,type:'system',linkRoute:'book-details',linkId:modelId});
    await refreshBooks(); return modelId;
  },[user,pickupPoints,addNotification,refreshBooks]);

  const updateBookStatus=useCallback(async(listingId:string,availability:BookListing['availability'])=>{
    const {error}=await supabase.rpc('set_my_marketplace_listing_status',{p_listing_id:listingId,p_status:availability}); if(error) throw new Error(error.message); await refreshBooks();
  },[refreshBooks]);
  const deleteBookListing=useCallback(async(listingId:string)=>{const {error}=await supabase.from('seller_listings').delete().eq('id',listingId);if(error)throw new Error(error.message);await refreshBooks();},[refreshBooks]);

  // ── Order actions ────────────────────────────────────────────────────────
  const createOrder = useCallback(async (bookId: string, pickupPointId: string): Promise<{ orderId: string; error: string | null }> => {
    if (!user) return { orderId: '', error: 'Please log in first.' };

    // 1. Try atomic place_order RPC in Supabase
    try {
      const { data, error } = await supabase.rpc('place_order', {
        p_seller_listing_id: bookId,
        p_pickup_point_id: pickupPointId,
      });

      if (!error && data) {
        await Promise.all([refreshBooks(), refreshOrders(), refreshNotifications()]);
        return { orderId: data as string, error: null };
      }
      const rpcMessage = error?.message || '';
      if (rpcMessage) {
        return { orderId: '', error: rpcMessage };
      }
    } catch (rpcErr) {
      console.warn('place_order RPC threw error:', rpcErr);
    }

    const targetBook = books.find((b) => (b.offers ?? []).some((o) => o.id === bookId));
    if (!targetBook) {
      return { orderId: '', error: 'Book listing not found.' };
    }
    if (!(targetBook.offers ?? []).some((o) => o.id === bookId && o.availability === 'Available')) {
      return { orderId: '', error: 'This book is no longer available.' };
    }
    if ((targetBook.offers ?? []).find((o) => o.id === bookId)?.seller.id === user.id) {
      return { orderId: '', error: 'You cannot buy your own listing.' };
    }

    return {
      orderId: '',
      error: 'Checkout is temporarily unavailable. Ask campus desk to apply the latest database patch, then try again.',
    };
  }, [user, books, refreshBooks, refreshOrders, refreshNotifications]);

  const verifyPickupPin = useCallback(async (orderId: string, pin: string): Promise<{ success: boolean; message: string }> => {
    // 1. Try RPC
    try {
      const { data, error } = await supabase.rpc('verify_pickup_pin', {
        p_order_id: orderId,
        p_pin: pin.trim(),
      });

      if (!error && data) {
        await Promise.all([refreshOrders(), refreshBooks(), refreshNotifications()]);
        return data as { success: boolean; message: string };
      }
      if (data && typeof data === 'object' && 'success' in (data as object)) {
        return data as { success: boolean; message: string };
      }
      console.warn('verify_pickup_pin RPC unavailable:', error?.message);
    } catch (rpcErr) {
      console.warn('verify_pickup_pin threw:', rpcErr);
    }

    return {
      success: false,
      message: 'PIN verification must be completed at the campus desk. Please try again shortly.',
    };
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
    if (!user) throw new Error('Please log in to file a report.');
    const order = orders.find((o) => o.orderNumber === orderNumber);

    if (order) {
      const { error } = await supabase.rpc('open_order_dispute', {
        p_order_id: order.id,
        p_reason: reason,
        p_details: details,
      });
      if (error) throw new Error(error.message);
      await Promise.all([refreshDisputes(), refreshOrders()]);
      return;
    }

    // Listing-only reports do not have an order to freeze.
    const { error } = await supabase.from('disputes').insert({
      order_id: null,
      order_number: orderNumber,
      book_title: bookTitle,
      reported_by: user.id,
      reason,
      details,
    });
    if (error) throw new Error(error.message);
    await refreshDisputes();
  }, [user, orders, refreshDisputes, refreshOrders]);

  const resolveDispute = useCallback(async (disputeId: string, status: DisputeReport['status']) => {
    const { error } = await supabase.rpc('resolve_order_dispute', {
      p_dispute_id: disputeId,
      p_status: status,
    });
    if (error) throw new Error(error.message);
    await Promise.all([refreshDisputes(), refreshOrders(), refreshBooks()]);
  }, [refreshDisputes, refreshOrders, refreshBooks]);

  // ── Reviews ──────────────────────────────────────────────────────────────
  const submitReview = useCallback(async (
    orderId: string,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'Please log in to leave a review.' };

    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found.' };
    if (order.orderType === 'semester_bundle') return { success: false, message: 'Bundle reviews will be enabled in a later schema update.' };
    if (order.status !== 'completed') {
      return { success: false, message: 'Reviews unlock once the pickup PIN is verified.' };
    }

    const counterparty = order.buyer.id === user.id ? order.seller : order.buyer;

    const { error } = await supabase.from('reviews').insert({
      order_id: orderId,
      seller_listing_id: order.sellerListingId,
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
      const missingTable = /book_requests|schema cache|PGRST205/i.test(error.message);
      return {
        success: false,
        message: missingTable
          ? 'Book requests are not enabled on this campus database yet. Ask desk to apply schema-p1-requests.sql.'
          : error.message,
      };
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
        fulfilled_by_listing_id: bookId || null,
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
    navigate(`/books?search=${encodeURIComponent(codeOrName)}`);
  };

  // ── Computed: filtered books ─────────────────────────────────────────────
  const filteredBooks = React.useMemo(() => {
    return books.filter((book) => {
      const query = (filters.search || searchQuery).trim().toLowerCase();
      if (query) {
        const curriculumText=(book.curriculumEntries??[]).map(entry=>`${entry.department} ${entry.semester} ${entry.technologyCode}`).join(' ');
        const matches = [book.title, book.author, book.subjectName, book.subjectCode, book.department,curriculumText]
          .some((f) => f.toLowerCase().includes(query));
        if (!matches) return false;
      }
      const curriculum=book.curriculumEntries??[];
      if (filters.department !== 'All Departments' && !curriculum.some(entry=>entry.department===filters.department) && book.department !== filters.department) return false;
      if (filters.semester !== 'All Semesters' && !curriculum.some(entry=>entry.semester===filters.semester&&(filters.department==='All Departments'||entry.department===filters.department)) && book.semester !== filters.semester) return false;
      const activeOffers=(book.offers ?? []).filter((o)=>o.availability==='Available');
      if (filters.condition !== 'All Conditions' && !activeOffers.some((o)=>o.condition===filters.condition)) return false;
      if (filters.subjectCode.trim()) {
        const code = filters.subjectCode.trim().toLowerCase();
        if (!book.subjectCode.toLowerCase().includes(code) && !book.subjectName.toLowerCase().includes(code)) {
          return false;
        }
      }
      if (filters.availability === 'Available' && activeOffers.length===0) return false;
      if (filters.availability === 'Unavailable' && activeOffers.length>0) return false;
      if (!['All','Available','Unavailable'].includes(filters.availability) && !(book.offers ?? []).some((o)=>o.availability===filters.availability)) return false;
      if (activeOffers.length>0&&!activeOffers.some((o)=>o.sellingPrice >= filters.minPrice && o.sellingPrice <= filters.maxPrice)) return false;
      if (activeOffers.length===0&&(filters.minPrice>0||filters.maxPrice<2000)) return false;
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
      if (filters.sortBy === 'price_low') return (a.lowestPrice ?? Infinity) - (b.lowestPrice ?? Infinity);
      if (filters.sortBy === 'price_high') return (b.lowestPrice ?? 0) - (a.lowestPrice ?? 0);
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

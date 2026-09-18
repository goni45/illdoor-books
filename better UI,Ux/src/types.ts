export type Condition = 'Like New' | 'Good' | 'Used' | 'Heavily Used';

export type BookAvailability = 'Available' | 'Reserved' | 'Sold';

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  studentId: string;
  institute: string;
  department: string;
  semester: string;
  avatar: string;
  isVerified: boolean;
  joinedDate: string;
  rating: number;
  totalSales: number;
  totalPurchases: number;
  phone?: string;
  rollNumber?: string;
  isAdmin?: boolean;
  registrationNo?: string;
  verificationStatus?: VerificationStatus;
}

export interface BookListing {
  id: string;
  title: string;
  author: string;
  edition?: string;
  subjectCode: string;
  subjectName: string;
  department: string;
  semester: string;
  condition: Condition;
  conditionDetails: string;
  originalPrice: number;
  sellingPrice: number;
  savings: number;
  images: string[];
  availability: BookAvailability;
  seller: StudentUser;
  pickupPointId: string;
  pickupPointName: string;
  createdAt: string;
  createdAtRaw?: string;
  viewsCount?: number;
  isbn?: string;
  isAdminListing?: boolean;
}

export interface PickupPoint {
  id: string;
  name: string;
  campus: string;
  locationDetail: string;
  operatingHours: string;
  contactPerson: string;
  phone: string;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'dropped_off'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  label: string;
  note: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  book: BookListing;
  buyer: StudentUser;
  seller: StudentUser;
  price: number;
  status: OrderStatus;
  pickupPoint: PickupPoint;
  paymentState: 'Paid (Escrow)' | 'Pending' | 'Released to Seller' | 'Refunded';
  verificationPin: string;
  cancelReason?: string;
  createdAt: string;
  createdAtRaw?: string;
  updatedAt: string;
  timeline: OrderTimelineEvent[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'pickup' | 'verification' | 'system' | 'dispute';
  read: boolean;
  timestamp: string;
  linkRoute?: string;
  linkId?: string;
}

export interface Review {
  id: string;
  reviewerName: string;
  reviewerDepartment: string;
  rating: number;
  comment: string;
  date: string;
  bookTitle: string;
  /** DB-backed fields — present on real marketplace reviews */
  orderId?: string;
  orderNumber?: string;
  reviewerId?: string;
  revieweeId?: string;
  bookId?: string;
  /** True when the review is tied to a completed order */
  isVerifiedTransaction?: boolean;
}

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationRequest {
  id: string;
  userId: string;
  studentRoll: string;
  studentRegNo: string;
  idCardPath: string | null;
  status: VerificationStatus;
  adminNote: string;
  createdAt: string;
  reviewedAt?: string;
  /** Joined profile details, used by the admin review queue */
  userName?: string;
  userInstitute?: string;
  userDepartment?: string;
  userSemester?: string;
}

export interface DisputeReport {
  id: string;
  orderNumber: string;
  bookTitle: string;
  reportedBy: string;
  reason: string;
  details: string;
  status: 'Open' | 'Under Review' | 'Resolved';
  date: string;
  priority: 'Low' | 'Medium' | 'High';
}

export interface BookRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
  requesterDepartment?: string;
  title: string;
  subjectCode: string;
  department: string;
  semester: string;
  maxBudget?: number;
  description?: string;
  status: 'open' | 'fulfilled' | 'cancelled';
  fulfilledByBookId?: string;
  createdAt: string;
  createdAtRaw: number;
}

export interface FilterState {
  search: string;
  department: string;
  semester: string;
  subjectCode: string;
  condition: string;
  availability: string;
  minPrice: number;
  maxPrice: number;
  sortBy: 'recommended' | 'newest' | 'price_low' | 'price_high';
}

export type ActiveView =
  | 'home'
  | 'browse'
  | 'book-details'
  | 'sell'
  | 'orders'
  | 'wishlist'
  | 'requests'
  | 'notifications'
  | 'profile'
  | 'admin';


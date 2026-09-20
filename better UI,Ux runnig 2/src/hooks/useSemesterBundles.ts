import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { BookListing, BundleSingleBookRequest, SemesterBundle, SemesterBundleItem, StudentUser } from '../types';
import { useAuth } from '../context/AuthContext';
import { COVER_PLACEHOLDER } from '../lib/publicationEditions';

const emptySeller: StudentUser = {
  id: '', name: 'Student', email: '', studentId: '', institute: '', department: '', semester: '',
  avatar: '', isVerified: false, joinedDate: '', rating: 0, totalSales: 0, totalPurchases: 0,
};

function sellerFromRow(row: Record<string, unknown> | null): StudentUser {
  if (!row) return emptySeller;
  const name = String(row.full_name || 'Student');
  return {
    ...emptySeller,
    id: String(row.id || ''),
    name,
    institute: String(row.institute || ''),
    department: String(row.department || ''),
    semester: String(row.semester || ''),
    avatar: String(row.avatar_url || ('https:' + '//api.dicebear.com/8.x/initials/svg?seed=' + encodeURIComponent(name) + '&backgroundColor=ef4d23')) ,
    isVerified: Boolean(row.is_verified),
    isAdmin: Boolean(row.is_admin),
    rating: Number(row.rating || 0),
    totalSales: Number(row.total_sales || 0),
    totalPurchases: Number(row.total_purchases || 0),
  };
}

function bookFromRow(row: Record<string, unknown>): BookListing {
  const editions = (row.book_publication_editions || []) as Array<Record<string, unknown>>;
  const cover = String(editions.find((item) => item.cover_image_url)?.cover_image_url || row.common_image_url || COVER_PLACEHOLDER);
  return {
    id: String(row.id), title: String(row.title || ''), author: String(row.author || 'Unknown'),
    edition: row.edition ? String(row.edition) : undefined,
    subjectCode: String(row.subject_code || ''), subjectName: String(row.subject_name || row.title || ''),
    department: String(row.department || ''), semester: String(row.semester || ''),
    condition: 'Used', conditionDetails: '', originalPrice: 0, sellingPrice: 0, savings: 0,
    images: [cover], commonCoverImageUrl: cover, availability: 'Available', seller: emptySeller,
    pickupPointId: '', pickupPointName: '', createdAt: '', offers: [], availableStock: 0, sellerCount: 0,
    publication: (row.publication as BookListing['publication']) || 'Haque Publication',
    status: (row.status as BookListing['status']) || 'active',
  };
}

export type BundleDraft = {
  semester: string;
  originalPrice: number;
  sellingPrice: number;
  pickupPointId: string;
  items: Array<{
    bookId: string;
    publication: 'Haque Publication' | 'Technical Publication';
    condition: 'Like New' | 'Good' | 'Used' | 'Heavily Used';
    conditionDetails: string;
  }>;
};

export function useSemesterBundles() {
  const { user, profile } = useAuth();
  const [bundles, setBundles] = useState<SemesterBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [singleBookRequests, setSingleBookRequests] = useState<BundleSingleBookRequest[]>([]);

  const refreshBundles = useCallback(async () => {
    if (!user || !profile) {
      setBundles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('semester_bundles')
      .select(`*, seller:profiles!seller_id(id,full_name,avatar_url,is_verified,is_admin,rating,total_sales,total_purchases,institute,department,semester), semester_bundle_items(*, books(*, book_publication_editions(*)))`)
      .order('created_at', { ascending: false });
    if (queryError) {
      setError(queryError.message);
      setBundles([]);
      setLoading(false);
      return;
    }
    const normalizedDepartment = profile.department.trim().toLowerCase();
    const normalizedInstitute = profile.institute.trim().toLowerCase();
    const mapped = (data || []).map((row: any): SemesterBundle => {
      const seller = sellerFromRow(row.seller || null);
      const items: SemesterBundleItem[] = (row.semester_bundle_items || []).map((item: any) => ({
        id: item.id,
        bundleId: row.id,
        bookId: item.book_id,
        book: bookFromRow(item.books || {}),
        publication: item.publication,
        condition: item.condition,
        conditionDetails: item.condition_details || '',
      }));
      return {
        id: row.id, batchId: row.batch_id, seller, department: row.department, semester: row.semester,
        originalPrice: Number(row.original_price), sellingPrice: Number(row.selling_price),
        savings: Math.max(0, Number(row.original_price) - Number(row.selling_price)),
        pickupPointId: row.pickup_point_id, pickupPointName: row.pickup_point_name,
        availability: row.availability, items,
        createdAt: new Date(row.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }),
        createdAtRaw: row.created_at,
      };
    }).filter((bundle: SemesterBundle) => profile.isAdmin || bundle.seller.id === user.id || (
      bundle.department.trim().toLowerCase() === normalizedDepartment &&
      bundle.seller.institute.trim().toLowerCase() === normalizedInstitute
    ));
    setError(null);
    setBundles(mapped);
    setLoading(false);
  }, [user, profile]);

  useEffect(() => { void refreshBundles(); }, [refreshBundles]);

  const refreshSingleBookRequests = useCallback(async () => {
    if (!user) { setSingleBookRequests([]); return; }
    const { data } = await supabase.from('bundle_single_book_requests').select('*').order('created_at', { ascending: false });
    setSingleBookRequests((data || []).map((row: any) => ({
      id: row.id, bundleId: row.bundle_id, bookId: row.book_id, buyerId: row.buyer_id,
      sellerId: row.seller_id, message: row.message || '', status: row.status,
      createdAt: new Date(row.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }),
    })));
  }, [user]);
  useEffect(() => { void refreshSingleBookRequests(); }, [refreshSingleBookRequests]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`semester-bundles-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'semester_bundles' }, () => { void refreshBundles(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, refreshBundles]);

  const createBundleBatch = useCallback(async (drafts: BundleDraft[]) => {
    const { data, error: rpcError } = await supabase.rpc('create_semester_bundle_batch', { p_bundles: drafts });
    if (rpcError) throw new Error(rpcError.message);
    await refreshBundles();
    return data as { batchId: string; bundleIds: string[] };
  }, [refreshBundles]);

  const buyBundle = useCallback(async (bundleId: string) => {
    const { data, error: rpcError } = await supabase.rpc('place_semester_bundle_order', { p_bundle_id: bundleId });
    if (rpcError) return { orderId: '', error: rpcError.message };
    await refreshBundles();
    return { orderId: String(data || ''), error: null };
  }, [refreshBundles]);

  const requestSingleBook = useCallback(async (bundleId: string, bookId: string, message: string) => {
    const { error: rpcError } = await supabase.rpc('request_bundle_single_book', {
      p_bundle_id: bundleId, p_book_id: bookId, p_message: message,
    });
    if (rpcError) return { success: false, message: rpcError.message };
    await refreshSingleBookRequests();
    return { success: true, message: 'Seller-এর কাছে single-book request পাঠানো হয়েছে।' };
  }, [refreshSingleBookRequests]);

  const respondToSingleBookRequest = useCallback(async (requestId: string, decision: 'accepted' | 'rejected', originalPrice?: number, sellingPrice?: number) => {
    const { data, error: rpcError } = await supabase.rpc('respond_bundle_single_book_request', {
      p_request_id: requestId, p_decision: decision,
      p_original_price: originalPrice ?? null, p_selling_price: sellingPrice ?? null,
    });
    if (rpcError) return { success: false, message: rpcError.message, listingId: '' };
    await Promise.all([refreshBundles(), refreshSingleBookRequests()]);
    return { success: true, message: decision === 'accepted' ? 'Individual listing created; the semester bundle is now inactive.' : 'Request rejected.', listingId: String(data || '') };
  }, [refreshBundles, refreshSingleBookRequests]);

  return { bundles, singleBookRequests, loading, error, refreshBundles, createBundleBatch, buyBundle, requestSingleBook, respondToSingleBookRequest };
}

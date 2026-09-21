import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { BookListing, SemesterBundle, SemesterBundleItem, StudentUser } from '../types';
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
  pickupType?: 'campus_spot' | 'seller_place';
  sellerPlaceAddress?: string;
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
        const isSellerPlace = row.pickup_type === 'seller_place' || row.pickup_point_id === 'seller_place' || String(row.pickup_point_name || '').includes('সেলার') || String(row.pickup_point_name || '').includes('বাসা');
        const sellerPlaceAddress = row.seller_place_address || '';
        return {
          id: row.id, batchId: row.batch_id, seller, department: row.department, semester: row.semester,
          originalPrice: Number(row.original_price), sellingPrice: Number(row.selling_price),
          savings: Math.max(0, Number(row.original_price) - Number(row.selling_price)),
          pickupPointId: row.pickup_point_id,
          pickupPointName: isSellerPlace ? (sellerPlaceAddress ? `সেলার স্থান: ${sellerPlaceAddress}` : 'সেলার স্থান / বাসা থেকে পিকআপ') : (row.pickup_point_name || 'ক্যাম্পাস পিকআপ পয়েন্ট'),
          pickupType: (isSellerPlace ? 'seller_place' : 'campus_spot') as 'campus_spot' | 'seller_place',
          sellerPlaceAddress,
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

  const setBundleStatus = useCallback(async (bundleId: string, status: SemesterBundle['availability']) => {
    const { error: rpcError } = await supabase.rpc('set_my_semester_bundle_status', {
      p_bundle_id: bundleId,
      p_status: status,
    });
    if (rpcError) throw new Error(rpcError.message);
    await refreshBundles();
  }, [refreshBundles]);

  return { bundles, loading, error, refreshBundles, createBundleBatch, setBundleStatus };
}

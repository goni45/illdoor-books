import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          student_roll: string;
          institute: string;
          department: string;
          semester: string;
          phone: string | null;
          avatar_url: string | null;
          is_verified: boolean;
          rating: number;
          total_sales: number;
          total_purchases: number;
          is_admin: boolean;
          student_reg_no: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'rating' | 'total_sales' | 'total_purchases' | 'is_verified'>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      books: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          author: string;
          edition: string | null;
          subject_code: string;
          subject_name: string;
          department: string;
          semester: string;
          condition: string;
          condition_details: string;
          original_price: number;
          selling_price: number;
          savings: number;
          availability: string;
          pickup_point_id: string;
          pickup_point_name: string;
          views_count: number;
          isbn: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['books']['Row'], 'id' | 'created_at' | 'views_count' | 'savings'>;
        Update: Partial<Database['public']['Tables']['books']['Row']>;
      };
      book_images: {
        Row: {
          id: string;
          book_id: string;
          url: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['book_images']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['book_images']['Row']>;
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          book_id: string;
          buyer_id: string;
          seller_id: string;
          price: number;
          status: string;
          pickup_point_id: string;
          payment_state: string;
          verification_pin: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
      pickup_points: {
        Row: {
          id: string;
          name: string;
          campus: string;
          location_detail: string;
          operating_hours: string;
          contact_person: string;
          phone: string;
          is_active: boolean;
          created_at: string;
        };
      };
      wishlist: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          created_at: string;
        };
        Insert: { user_id: string; book_id: string };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read: boolean;
          link_route: string | null;
          link_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'read'>;
      };
      disputes: {
        Row: {
          id: string;
          order_id: string;
          order_number: string;
          book_title: string;
          reported_by: string;
          reason: string;
          details: string;
          status: string;
          priority: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['disputes']['Row'], 'id' | 'created_at' | 'status' | 'priority'>;
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          book_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at'>;
      };
      verification_requests: {
        Row: {
          id: string;
          user_id: string;
          student_roll: string;
          student_reg_no: string;
          id_card_path: string | null;
          status: 'pending' | 'approved' | 'rejected';
          admin_note: string;
          reviewed_by: string | null;
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['verification_requests']['Row'],
          'id' | 'created_at' | 'reviewed_at' | 'status' | 'admin_note' | 'reviewed_by'
        > &
          Partial<Pick<Database['public']['Tables']['verification_requests']['Row'], 'status' | 'admin_note' | 'reviewed_by'>>;
        Update: Partial<Database['public']['Tables']['verification_requests']['Row']>;
      };
    };
  };
};

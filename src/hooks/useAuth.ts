import { useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { StudentUser } from '../types';

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: StudentUser | null;
  loading: boolean;
  error: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  studentRoll: string;
  institute: string;
  department: string;
  semester: string;
  phone?: string;
}

/** Converts a Supabase profile row → app's StudentUser type */
function mapProfileToUser(profile: Record<string, unknown>, email: string): StudentUser {
  return {
    id: profile.id as string,
    name: profile.full_name as string,
    email,
    studentId: profile.student_roll as string,
    institute: profile.institute as string,
    department: profile.department as string,
    semester: profile.semester as string,
    avatar: (profile.avatar_url as string) || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(profile.full_name as string)}&backgroundColor=ef4d23`,
    isVerified: (profile.is_verified as boolean) || false,
    joinedDate: new Date(profile.created_at as string).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'long',
    }),
    rating: parseFloat((profile.rating as number)?.toString() || '0') || 0,
    totalSales: (profile.total_sales as number) || 0,
    totalPurchases: (profile.total_purchases as number) || 0,
    phone: profile.phone as string | undefined,
    rollNumber: profile.student_roll as string,
    isAdmin: Boolean(profile.is_admin),
    registrationNo: (profile.student_reg_no as string) || undefined,
  };
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  /** Fetch profile from DB and update state */
  const fetchProfile = useCallback(async (userId: string, email: string) => {
    const { data, error } = await supabase.rpc('get_my_profile');

    if (error || !data) {
      console.warn('Profile fetch failed:', error?.message);
      return null;
    }

    return mapProfileToUser(data as Record<string, unknown>, email);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email || '');
        setAuthState({ session, user: session.user, profile, loading: false, error: null });
      } else {
        setAuthState((prev) => ({ ...prev, session: null, user: null, profile: null, loading: false }));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email || '');
        setAuthState({ session, user: session.user, profile, loading: false, error: null });
      } else {
        setAuthState({ session: null, user: null, profile: null, loading: false, error: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  /** Register a new student */
  const signUp = useCallback(async (data: SignUpData): Promise<{ error: string | null }> => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          student_roll: data.studentRoll,
          institute: data.institute,
          department: data.department,
          semester: data.semester,
          phone: data.phone || null,
        },
      },
    });

    if (error) {
      setAuthState((prev) => ({ ...prev, loading: false, error: error.message }));
      return { error: error.message };
    }

    setAuthState((prev) => ({ ...prev, loading: false, error: null }));
    return { error: null };
  }, []);

  /** Sign in with email + password */
  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthState((prev) => ({ ...prev, loading: false, error: error.message }));
      return { error: error.message };
    }

    return { error: null };
  }, []);

  /** Sign out */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  /** Send password reset email */
  const resetPassword = useCallback(async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });
    return { error: error?.message || null };
  }, []);

  /** Refresh current user's profile from DB */
  const refreshProfile = useCallback(async () => {
    if (!authState.user) return;
    const profile = await fetchProfile(authState.user.id, authState.user.email || '');
    setAuthState((prev) => ({ ...prev, profile }));
  }, [authState.user, fetchProfile]);

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
  };
}

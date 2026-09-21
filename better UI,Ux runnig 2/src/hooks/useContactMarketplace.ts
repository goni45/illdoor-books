import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { ContactPreferences, ContactRevealResult } from '../types';

const EMPTY_PREFERENCES: ContactPreferences = {
  contactEnabled: false,
  contactPhone: '',
  whatsappPhone: '',
  preferredMethod: 'both',
};

export function useContactMarketplace(loadOwnPreferences = false) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<ContactPreferences>(EMPTY_PREFERENCES);
  const [loadingPreferences, setLoadingPreferences] = useState(loadOwnPreferences);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const refreshPreferences = useCallback(async () => {
    if (!user || !loadOwnPreferences) {
      setLoadingPreferences(false);
      return;
    }
    setLoadingPreferences(true);
    const { data, error } = await supabase.rpc('get_my_contact_preferences');
    setLoadingPreferences(false);
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Contact preferences were not found.');
    const row = data as Record<string, unknown>;
    setPreferences({
      contactEnabled: Boolean(row.contact_enabled),
      contactPhone: String(row.contact_phone || ''),
      whatsappPhone: String(row.whatsapp_phone || ''),
      preferredMethod: (row.preferred_method as ContactPreferences['preferredMethod']) || 'both',
    });
  }, [loadOwnPreferences, user]);

  useEffect(() => {
    void refreshPreferences().catch((error) => console.warn('Contact preferences unavailable:', error));
  }, [refreshPreferences]);

  const savePreferences = useCallback(async (next: ContactPreferences) => {
    setSavingPreferences(true);
    try {
      const { error } = await supabase.rpc('update_my_contact_preferences', {
        p_contact_enabled: next.contactEnabled,
        p_contact_phone: next.contactPhone.trim() || null,
        p_whatsapp_phone: next.whatsappPhone.trim() || null,
        p_preferred_method: next.preferredMethod,
      });
      if (error) throw new Error(error.message);
      setPreferences(next);
    } finally {
      setSavingPreferences(false);
    }
  }, []);

  const revealContact = useCallback(async (input: {
    listingId?: string;
    bundleId?: string;
    bookId?: string;
    message?: string;
  }): Promise<ContactRevealResult> => {
    const { data, error } = await supabase.rpc('open_seller_contact', {
      p_listing_id: input.listingId || null,
      p_bundle_id: input.bundleId || null,
      p_book_id: input.bookId || null,
      p_message: input.message?.trim() || null,
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Seller contact was not returned.');
    return data as ContactRevealResult;
  }, []);

  return {
    preferences,
    setPreferences,
    loadingPreferences,
    savingPreferences,
    refreshPreferences,
    savePreferences,
    revealContact,
  };
}

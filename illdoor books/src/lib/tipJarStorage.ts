import { supabase } from './supabase';

export interface TipJarLeaderboardEntry {
  id: string;
  name: string;
  amount: number;
  message?: string;
  timeAgo?: string;
}

export interface TipJarSettings {
  enabled: boolean;
  buttonText: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  bkashNumber: string;
  bkashType: string;
  nagadNumber: string;
  nagadType: string;
  rocketNumber: string;
  rocketType: string;
  targetAmount: number;
  collectedAmount: number;
  note: string;
  showLeaderboard?: boolean;
  leaderboard?: TipJarLeaderboardEntry[];
}

export const DEFAULT_LEADERBOARD_ENTRIES: TipJarLeaderboardEntry[] = [
  { id: '1', name: 'Mahi', amount: 200, message: 'iPhone er jonno chotto valobasha!', timeAgo: 'Just now' },
  { id: '2', name: 'Tanvir (CST)', amount: 500, message: 'Best of luck bhai, new iPhone chai!', timeAgo: '2 hours ago' },
  { id: '3', name: 'Sabbir Ahmed', amount: 300, message: 'Polytechnic community rocks ❤️', timeAgo: 'Yesterday' },
];

export const DEFAULT_TIP_JAR_SETTINGS: TipJarSettings = {
  enabled: true,
  buttonText: 'Help me to buy a new iPhone',
  title: 'Help me to buy a new iPhone',
  subtitle: 'আমার না আপনার কাছ থেকে একটা iPhone পেতে ইচ্ছে করছে... আমাকে একটা iPhone কিনতে সাহায্য করবেন? 🥺👉👈',
  imageUrl: 'https://images.meme-arsenal.com/6105c3761e035663ba81e5667a46ee4d.jpg',
  bkashNumber: '01712345678',
  bkashType: 'Personal (Send Money)',
  nagadNumber: '01812345678',
  nagadType: 'Personal (Send Money)',
  rocketNumber: '01912345678',
  rocketType: 'Personal (Send Money)',
  targetAmount: 125000,
  collectedAmount: 16800,
  note: 'টাকা পাঠানোর পর রেফারেন্সে আপনার নাম/ডিপার্টমেন্ট লিখে দিতে পারেন। আপনাদের এই ভালোবাসা ও সাহায্য আমাদের নতুন ফিচার বানাতে উৎসাহ দেয়!',
  showLeaderboard: true,
  leaderboard: DEFAULT_LEADERBOARD_ENTRIES,
};

const STORAGE_KEY = 'poly_iphone_tip_jar_settings_v1';
const EVENT_NAME = 'poly_tip_jar_settings_updated';

// In-memory cache for fast synchronous access
let memorySettingsCache: TipJarSettings | null = null;

// Maps database row to TipJarSettings
function mapDbRowToSettings(row: Record<string, any>): TipJarSettings {
  return {
    enabled: typeof row.enabled === 'boolean' ? row.enabled : DEFAULT_TIP_JAR_SETTINGS.enabled,
    buttonText: row.button_text ?? row.buttonText ?? DEFAULT_TIP_JAR_SETTINGS.buttonText,
    title: row.title ?? DEFAULT_TIP_JAR_SETTINGS.title,
    subtitle: row.subtitle ?? DEFAULT_TIP_JAR_SETTINGS.subtitle,
    imageUrl: row.image_url ?? row.imageUrl ?? DEFAULT_TIP_JAR_SETTINGS.imageUrl,
    bkashNumber: row.bkash_number ?? row.bkashNumber ?? DEFAULT_TIP_JAR_SETTINGS.bkashNumber,
    bkashType: row.bkash_type ?? row.bkashType ?? DEFAULT_TIP_JAR_SETTINGS.bkashType,
    nagadNumber: row.nagad_number ?? row.nagadNumber ?? DEFAULT_TIP_JAR_SETTINGS.nagadNumber,
    nagadType: row.nagad_type ?? row.nagadType ?? DEFAULT_TIP_JAR_SETTINGS.nagadType,
    rocketNumber: row.rocket_number ?? row.rocketNumber ?? DEFAULT_TIP_JAR_SETTINGS.rocketNumber,
    rocketType: row.rocket_type ?? row.rocketType ?? DEFAULT_TIP_JAR_SETTINGS.rocketType,
    targetAmount: Number(row.target_amount ?? row.targetAmount ?? DEFAULT_TIP_JAR_SETTINGS.targetAmount) || 0,
    collectedAmount: Number(row.collected_amount ?? row.collectedAmount ?? DEFAULT_TIP_JAR_SETTINGS.collectedAmount) || 0,
    note: row.note ?? DEFAULT_TIP_JAR_SETTINGS.note,
    showLeaderboard: typeof row.show_leaderboard === 'boolean' ? row.show_leaderboard : (typeof row.showLeaderboard === 'boolean' ? row.showLeaderboard : DEFAULT_TIP_JAR_SETTINGS.showLeaderboard),
    leaderboard: Array.isArray(row.leaderboard) && row.leaderboard.length > 0 ? row.leaderboard : DEFAULT_LEADERBOARD_ENTRIES,
  };
}

// Maps TipJarSettings to database payload
function mapSettingsToDbPayload(settings: TipJarSettings) {
  return {
    id: 'default',
    enabled: settings.enabled,
    button_text: settings.buttonText,
    title: settings.title,
    subtitle: settings.subtitle,
    image_url: settings.imageUrl,
    bkash_number: settings.bkashNumber,
    bkash_type: settings.bkashType,
    nagad_number: settings.nagadNumber,
    nagad_type: settings.nagadType,
    rocket_number: settings.rocketNumber,
    rocket_type: settings.rocketType,
    target_amount: settings.targetAmount,
    collected_amount: settings.collectedAmount,
    note: settings.note,
    show_leaderboard: settings.showLeaderboard ?? true,
    leaderboard: settings.leaderboard ?? [],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Synchronous getter: Returns from memory cache or localStorage
 */
export function getTipJarSettings(): TipJarSettings {
  if (memorySettingsCache) {
    return memorySettingsCache;
  }

  if (typeof window === 'undefined') {
    return DEFAULT_TIP_JAR_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memorySettingsCache = DEFAULT_TIP_JAR_SETTINGS;
      return DEFAULT_TIP_JAR_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    const resolved: TipJarSettings = {
      ...DEFAULT_TIP_JAR_SETTINGS,
      ...parsed,
      leaderboard: Array.isArray(parsed?.leaderboard) && parsed.leaderboard.length > 0
        ? parsed.leaderboard
        : DEFAULT_LEADERBOARD_ENTRIES,
    };
    memorySettingsCache = resolved;
    return resolved;
  } catch {
    memorySettingsCache = DEFAULT_TIP_JAR_SETTINGS;
    return DEFAULT_TIP_JAR_SETTINGS;
  }
}

/**
 * Async fetcher: Fetches from Supabase database and updates cache
 */
export async function fetchTipJarSettings(): Promise<TipJarSettings> {
  try {
    const { data, error } = await supabase
      .from('tip_jar_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      // Table might not exist yet or connection issue
      console.warn('Tip jar settings query notice:', error.message);
      return getTipJarSettings();
    }

    if (data) {
      const mapped = mapDbRowToSettings(data);
      memorySettingsCache = mapped;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: mapped }));
      } catch (e) {
        console.error('LocalStorage write failed', e);
      }
      return mapped;
    }
  } catch (err) {
    console.warn('Error fetching tip jar settings from database:', err);
  }

  return getTipJarSettings();
}

/**
 * Async saver: Updates memory, localStorage, and saves/upserts to Supabase database
 */
export async function saveTipJarSettings(settings: Partial<TipJarSettings>): Promise<{
  success: boolean;
  data: TipJarSettings;
  error?: string;
}> {
  const current = getTipJarSettings();
  const updated: TipJarSettings = {
    ...current,
    ...settings,
    leaderboard: settings.leaderboard !== undefined ? settings.leaderboard : current.leaderboard,
  };

  // 1. Optimistic update: cache & localStorage & local event
  memorySettingsCache = updated;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
    }
  } catch (err) {
    console.error('Failed to save tip jar settings to localStorage', err);
  }

  // 2. Persist to Supabase Database
  try {
    const payload = mapSettingsToDbPayload(updated);
    const { data, error } = await supabase
      .from('tip_jar_settings')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to save tip jar settings to Supabase database:', error);
      return {
        success: false,
        data: updated,
        error: error.message,
      };
    }

    const savedSettings = data ? mapDbRowToSettings(data) : updated;
    memorySettingsCache = savedSettings;
    return {
      success: true,
      data: savedSettings,
    };
  } catch (err: any) {
    console.error('Unexpected error saving tip jar settings to Supabase:', err);
    return {
      success: false,
      data: updated,
      error: err?.message || 'Database error occurred',
    };
  }
}

/**
 * Subscribe to settings changes (via local event and storage event)
 */
export function subscribeTipJarSettings(
  callback: (settings: TipJarSettings) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<TipJarSettings>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getTipJarSettings());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      memorySettingsCache = null; // bust cache
      callback(getTipJarSettings());
    }
  };

  window.addEventListener(EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  // Also setup Supabase Realtime channel if table is active
  let channel: ReturnType<typeof supabase.channel> | null = null;
  try {
    channel = supabase
      .channel('public:tip_jar_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tip_jar_settings' },
        (payload) => {
          if (payload.new) {
            const mapped = mapDbRowToSettings(payload.new);
            memorySettingsCache = mapped;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
            } catch {}
            callback(mapped);
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Realtime subscription notice for tip_jar_settings:', e);
  }

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}
